import { create } from 'zustand';
import { COMPONENT_METADATA } from '../engine/components';
import { getComponentDimensions, getPortWorldPosition } from '../engine/componentGeometry';
import { Simulator } from '../engine/simulator';
import { extractSubcircuit } from '../engine/subcircuits';
import { routeOrthogonalWire } from '../canvas/wireRouter';
import {
  BitVector,
  CircuitState,
  ComponentInstance,
  ComponentType,
  Point,
  SignalTraceSample,
  Wire,
  WireEndpoint
} from '../types/circuit';

export type ToolType = 'select' | 'poke' | 'wire' | 'delete';

interface HistorySnapshot {
  components: ComponentInstance[];
  wires: Wire[];
}

interface CircuitNavigationFrame {
  parentComponents: ComponentInstance[];
  parentWires: Wire[];
  parentSelectedIds: string[];
  parentHistory: HistorySnapshot[];
  parentHistoryIndex: number;
  subcircuitId: string;
  name: string;
}

/**
 * Global Zustand state and actions for logdev-Ultimate.
 */
interface CircuitStoreState {
  /** Active components placed on canvas */
  components: ComponentInstance[];
  /** Electrical wires connecting components */
  wires: Wire[];
  /** IDs of currently selected components or wires */
  selectedIds: string[];
  /** Component type currently attached to the pointer for placement */
  pendingComponentType: ComponentType | null;
  /** Active user interaction tool ('select' | 'poke' | 'wire' | 'delete') */
  tool: ToolType;
  /** Canvas viewport zoom scale factor (0.3 to 2.5) */
  zoom: number;
  /** Canvas pan translation offset (X, Y) */
  pan: Point;
  /** Whether the continuous simulation clock is ticking */
  isSimulating: boolean;
  /** Clock frequency in Hertz (1-20 Hz) */
  clockFrequency: number;
  /** Total simulation clock ticks elapsed */
  ticks: number;
  /** Engine simulator instance */
  simulator: Simulator;
  /** Selected single-bit ports recorded by the signal chronogram */
  tracedSignals: WireEndpoint[];
  /** Bounded history for the selected signal ports */
  signalHistory: SignalTraceSample[];
  /** Parent circuits for the currently edited hierarchical subcircuit */
  navigationStack: CircuitNavigationFrame[];

  /** Snapshots for full Undo/Redo support */
  history: HistorySnapshot[];
  /** Current index in the undo/redo history stack */
  historyIndex: number;

  // Actions
  /** Adds a new component to the canvas at given coordinates */
  addComponent: (type: ComponentType, x: number, y: number) => ComponentInstance;
  /** Starts or cancels pointer-based component placement */
  setPendingComponentType: (type: ComponentType | null) => void;
  /** Selects a set of components and wires */
  setSelectedIds: (ids: string[]) => void;
  /** Moves several components and reroutes their connected wires as one edit */
  moveComponents: (positions: Array<Pick<ComponentInstance, 'id' | 'x' | 'y'>>) => void;
  /** Pastes a copied circuit, optionally anchored at a world-space position */
  pasteCircuit: (circuit: CircuitState, anchor?: Point) => void;
  /** Replaces the selected component group with a reusable hierarchical block */
  createSubcircuitFromSelection: () => ComponentInstance;
  /** Opens a reusable block for editing */
  enterSubcircuit: (componentId: string) => void;
  /** Returns to the containing circuit */
  exitSubcircuit: () => void;
  /** Returns the complete root project, including any active child edits */
  getProjectCircuit: () => CircuitState;
  /** Updates component properties or position */
  updateComponent: (id: string, updates: Partial<ComponentInstance>) => void;
  /** Selects or deselects an element */
  selectElement: (id: string, multi?: boolean) => void;
  /** Clears selection */
  clearSelection: () => void;
  /** Removes selected components and auto-cleans orphan wires */
  removeSelected: () => void;
  /** Connects two ports with an orthogonal wire */
  addWire: (from: WireEndpoint, to: WireEndpoint, points: Point[]) => Wire;
  /** Places an electrical junction at an exact canvas coordinate */
  addJunctionAt: (position: Point) => ComponentInstance;
  /** Removes a wire by ID */
  removeWire: (wireId: string) => void;
  /** Sets current interactive tool */
  setTool: (tool: ToolType) => void;
  /** Updates zoom level */
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  /** Updates pan offset */
  setPan: (pan: Point | ((prev: Point) => Point)) => void;
  /** Direct toggle in Poke mode for input pins and switches */
  togglePinValue: (componentId: string) => void;
  /** Advances simulation by 1 tick */
  stepSimulation: () => void;
  /** Starts or pauses continuous simulation */
  setRunning: (running: boolean) => void;
  /** Configures clock frequency in Hz */
  setClockFrequency: (freq: number) => void;
  /** Selects which single-bit signals are captured in the chronogram */
  setTracedSignals: (signals: WireEndpoint[]) => void;
  /** Resets canvas and clears workspace */
  resetCircuit: () => void;
  /** Loads complete circuit JSON */
  loadCircuit: (circuit: CircuitState) => void;
  /** Reverts to previous state snapshot */
  undo: () => void;
  /** Advances to next state snapshot */
  redo: () => void;
}

const MAX_HISTORY = 30;
const MAX_SIGNAL_HISTORY = 300;
const MAX_TRACED_SIGNALS = 8;
const STATEFUL_COMPONENT_TYPES = new Set(['D_FLIP_FLOP', 'REGISTER', 'RAM']);

export function getSignalTraceKey(signal: WireEndpoint): string {
  return `${signal.componentId}:${signal.portId}`;
}

export const useCircuitStore = create<CircuitStoreState>((set, get) => {
  const initialSimulator = new Simulator();

  const pushHistory = (components: ComponentInstance[], wires: Wire[]) => {
    const { history, historyIndex } = get();
    const clonedSnapshot: HistorySnapshot = {
      components: JSON.parse(JSON.stringify(components)),
      wires: JSON.parse(JSON.stringify(wires)),
    };
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(clonedSnapshot);
    if (nextHistory.length > MAX_HISTORY) {
      nextHistory.shift();
    }
    set({
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
    });
  };

  const syncSimulator = (comps: ComponentInstance[], wires: Wire[]) => {
    const sim = get().simulator;
    sim.setCircuit(comps, wires);
    sim.step();
    const navigationStack = updateNavigationStack(comps, wires);
    set({ tracedSignals: [], signalHistory: [], navigationStack });
  };

  const updateNavigationStack = (
    components: ComponentInstance[],
    wires: Wire[],
    stack = get().navigationStack
  ): CircuitNavigationFrame[] => {
    if (stack.length === 0) return stack;
    const updatedStack = stack.map(frame => ({ ...frame }));
    let childCircuit: CircuitState = { components, wires };
    for (let index = updatedStack.length - 1; index >= 0; index--) {
      const frame = updatedStack[index];
      let found = false;
      const parentComponents = frame.parentComponents.map(component => {
        if (component.id !== frame.subcircuitId) return component;
        if (!component.subcircuit) {
          throw new Error(`A definição do subcircuito "${frame.name}" não foi encontrada.`);
        }
        found = true;
        return {
          ...component,
          subcircuit: { ...component.subcircuit, circuit: childCircuit },
        };
      });
      if (!found) {
        throw new Error(`O subcircuito "${frame.name}" não existe mais no circuito pai.`);
      }
      frame.parentComponents = parentComponents;
      frame.parentHistory = frame.parentHistory.map((snapshot, snapshotIndex) =>
        snapshotIndex === frame.parentHistoryIndex
          ? { components: parentComponents, wires: frame.parentWires }
          : snapshot
      );
      childCircuit = { components: parentComponents, wires: frame.parentWires };
    }
    return updatedStack;
  };

  return {
    components: [],
    wires: [],
    selectedIds: [],
    pendingComponentType: null,
    tool: 'select',
    zoom: 1,
    pan: { x: 0, y: 0 },
    isSimulating: true,
    clockFrequency: 2, // 2 Hz default
    ticks: 0,
    simulator: initialSimulator,
    tracedSignals: [],
    signalHistory: [],
    navigationStack: [],
    history: [{ components: [], wires: [] }],
    historyIndex: 0,

    addComponent: (type: ComponentType, x: number, y: number) => {
      const id = `${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const meta = COMPONENT_METADATA[type];
      const initialBitWidth = type === 'REGISTER' || type === 'HEX_DISPLAY' || type === 'ADDER'
        ? 4
        : type === 'RAM' || type === 'ROM' ? 8
        : type === 'PRIORITY_ENCODER' ? 4
        : type === 'DECODER' ? 2
        : type === 'SPLITTER' ? 2 : 1;
      const initialInputs = (
        ['AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR', 'MULTIPLEXER', 'DEMULTIPLEXER', 'RAM', 'ROM'].includes(type)
      ) ? 2 : undefined;
      const initialMemory = type === 'RAM' || type === 'ROM'
        ? Array.from({ length: 2 ** (initialInputs ?? 2) }, () => Array(initialBitWidth).fill('0'))
        : undefined;

      const newComp: ComponentInstance = {
        id,
        type,
        x,
        y,
        direction: 'EAST',
        label: meta ? meta.name : type,
        bitWidth: initialBitWidth,
        inputs: initialInputs,
        state: {
          value: Array(initialBitWidth).fill(type === 'CONSTANT' ? '1' : '0'),
          q: type === 'REGISTER' ? Array(initialBitWidth).fill('0') : '0',
          ...(initialMemory ? { memory: initialMemory } : {}),
        },
      };

      const nextComponents = [...get().components, newComp];
      set({ components: nextComponents, selectedIds: [id] });
      syncSimulator(nextComponents, get().wires);
      pushHistory(nextComponents, get().wires);
      return newComp;
    },

    setPendingComponentType: (type: ComponentType | null) => {
      set(type ? { pendingComponentType: type, tool: 'select' } : { pendingComponentType: type });
    },

    setSelectedIds: (ids: string[]) => {
      set({ selectedIds: [...new Set(ids)] });
    },

    moveComponents: (positions) => {
      const { components, wires } = get();
      const positionById = new Map(positions.map(({ id, x, y }) => [id, { x, y }]));
      const movedIds = new Set(positionById.keys());
      if (movedIds.size === 0) return;

      const nextComponents = components.map(component => {
        const position = positionById.get(component.id);
        return position ? { ...component, ...position } : component;
      });
      const nextWires = wires.map(wire => {
        if (!movedIds.has(wire.from.componentId) && !movedIds.has(wire.to.componentId)) {
          return wire;
        }
        const fromComponent = nextComponents.find(component => component.id === wire.from.componentId);
        const toComponent = nextComponents.find(component => component.id === wire.to.componentId);
        const from = fromComponent && getPortWorldPosition(fromComponent, wire.from.portId);
        const to = toComponent && getPortWorldPosition(toComponent, wire.to.portId);
        return from && to ? { ...wire, points: routeOrthogonalWire(from, to) } : wire;
      });

      set({ components: nextComponents, wires: nextWires });
      syncSimulator(nextComponents, nextWires);
      pushHistory(nextComponents, nextWires);
    },

    pasteCircuit: (circuit: CircuitState, anchor?: Point) => {
      if (circuit.components.length === 0) return;
      const minX = Math.min(...circuit.components.map(component => component.x));
      const minY = Math.min(...circuit.components.map(component => component.y));
      const offsetX = anchor ? anchor.x - minX : 40;
      const offsetY = anchor ? anchor.y - minY : 40;
      const idMap = new Map<string, string>();
      const pastedComponents = circuit.components.map(component => {
        const id = `${component.type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        idMap.set(component.id, id);
        return {
          ...JSON.parse(JSON.stringify(component)) as ComponentInstance,
          id,
          x: component.x + offsetX,
          y: component.y + offsetY,
        };
      });
      const pastedWires = circuit.wires.flatMap(wire => {
        const fromId = idMap.get(wire.from.componentId);
        const toId = idMap.get(wire.to.componentId);
        if (!fromId || !toId) return [];
        return [{
          ...JSON.parse(JSON.stringify(wire)) as Wire,
          id: `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          from: { ...wire.from, componentId: fromId },
          to: { ...wire.to, componentId: toId },
          points: wire.points.map(point => ({ x: point.x + offsetX, y: point.y + offsetY })),
        }];
      });
      const { components, wires } = get();
      const nextComponents = [...components, ...pastedComponents];
      const nextWires = [...wires, ...pastedWires];
      set({
        components: nextComponents,
        wires: nextWires,
        selectedIds: [...pastedComponents.map(component => component.id), ...pastedWires.map(wire => wire.id)],
      });
      syncSimulator(nextComponents, nextWires);
      pushHistory(nextComponents, nextWires);
    },

    createSubcircuitFromSelection: () => {
      const { components, wires, selectedIds } = get();
      const selectedComponentIds = components
        .filter(component => selectedIds.includes(component.id))
        .map(component => component.id);
      const { circuit, subcircuitId } = extractSubcircuit(
        { components, wires },
        selectedComponentIds,
        `Subcircuito ${components.filter(component => component.type === 'SUBCIRCUIT').length + 1}`
      );
      const createdSubcircuit = circuit.components.find(component => component.id === subcircuitId);
      if (!createdSubcircuit) throw new Error('O subcircuito criado não foi encontrado no circuito atualizado.');
      set({
        components: circuit.components,
        wires: circuit.wires,
        selectedIds: [subcircuitId],
      });
      syncSimulator(circuit.components, circuit.wires);
      pushHistory(circuit.components, circuit.wires);
      return createdSubcircuit;
    },

    enterSubcircuit: (componentId: string) => {
      const { components, wires, selectedIds, navigationStack, history, historyIndex } = get();
      const component = components.find(item => item.id === componentId);
      if (component?.type !== 'SUBCIRCUIT' || !component.subcircuit) {
        throw new Error('O componente selecionado não contém um subcircuito editável.');
      }
      const childCircuit = component.subcircuit.circuit;
      set({
        navigationStack: [...navigationStack, {
          parentComponents: components,
          parentWires: wires,
          parentSelectedIds: selectedIds,
          parentHistory: history,
          parentHistoryIndex: historyIndex,
          subcircuitId: component.id,
          name: component.subcircuit.name,
        }],
        components: childCircuit.components,
        wires: childCircuit.wires,
        selectedIds: [],
        history: [{ components: childCircuit.components, wires: childCircuit.wires }],
        historyIndex: 0,
      });
      syncSimulator(childCircuit.components, childCircuit.wires);
    },

    exitSubcircuit: () => {
      const { navigationStack } = get();
      if (navigationStack.length === 0) return;
      const navigationStackAfterExit = navigationStack.slice(0, -1);
      const frame = navigationStack[navigationStack.length - 1];
      set({
        navigationStack: navigationStackAfterExit,
        components: frame.parentComponents,
        wires: frame.parentWires,
        selectedIds: frame.parentSelectedIds,
        history: frame.parentHistory,
        historyIndex: frame.parentHistoryIndex,
      });
      syncSimulator(frame.parentComponents, frame.parentWires);
    },

    getProjectCircuit: () => {
      const { components, wires, navigationStack } = get();
      if (navigationStack.length === 0) return { components, wires };
      const rootFrame = navigationStack[0];
      return { components: rootFrame.parentComponents, wires: rootFrame.parentWires };
    },

    updateComponent: (id: string, updates: Partial<ComponentInstance>) => {
      const { components, wires } = get();
      const current = components.find(component => component.id === id);
      if (!current) return;

      const updated = { ...current, ...updates };
      if (updates.direction && updates.direction !== current.direction) {
        const oldSize = getComponentDimensions(current);
        const newSize = getComponentDimensions(updated);
        updated.x += (oldSize.width - newSize.width) / 2;
        updated.y += (oldSize.height - newSize.height) / 2;
      }

      const nextComponents = components.map(component => component.id === id ? updated : component);
      const geometryChanged = (
        (updates.direction !== undefined && updates.direction !== current.direction)
        || (updates.inputs !== undefined && updates.inputs !== current.inputs)
        || (updates.bitWidth !== undefined && updates.bitWidth !== current.bitWidth)
        || (updates.subcircuit !== undefined && updates.subcircuit !== current.subcircuit)
      );
      const validPorts = geometryChanged
        ? new Set(COMPONENT_METADATA[updated.type]
          .getPorts(updated.inputs, updated.bitWidth, updated)
          .map(port => port.id))
        : undefined;
      const wiresWithValidPorts = validPorts
        ? wires.filter(wire => {
            return (wire.from.componentId !== id || validPorts.has(wire.from.portId))
              && (wire.to.componentId !== id || validPorts.has(wire.to.portId));
          })
        : wires;
      const nextWires = geometryChanged
        ? wiresWithValidPorts.map(wire => {
            if (wire.from.componentId !== id && wire.to.componentId !== id) return wire;
            const fromComponent = nextComponents.find(component => component.id === wire.from.componentId);
            const toComponent = nextComponents.find(component => component.id === wire.to.componentId);
            const from = fromComponent && getPortWorldPosition(fromComponent, wire.from.portId);
            const to = toComponent && getPortWorldPosition(toComponent, wire.to.portId);
            return from && to
              ? { ...wire, points: routeOrthogonalWire(from, to) }
              : wire;
          })
        : wires;

      set({ components: nextComponents, wires: nextWires });
      syncSimulator(nextComponents, nextWires);
      pushHistory(nextComponents, nextWires);
    },

    selectElement: (id: string, multi = false) => {
      if (multi) {
        const { selectedIds } = get();
        if (selectedIds.includes(id)) {
          set({ selectedIds: selectedIds.filter(item => item !== id) });
        } else {
          set({ selectedIds: [...selectedIds, id] });
        }
      } else {
        set({ selectedIds: [id] });
      }
    },

    clearSelection: () => {
      set({ selectedIds: [] });
    },

    removeSelected: () => {
      const { selectedIds, components, wires } = get();
      if (selectedIds.length === 0) return;

      const selectedSet = new Set(selectedIds);
      const nextComponents = components.filter(c => !selectedSet.has(c.id));
      const nextWires = wires.filter(
        w => !selectedSet.has(w.id) &&
             !selectedSet.has(w.from.componentId) &&
             !selectedSet.has(w.to.componentId)
      );

      set({
        components: nextComponents,
        wires: nextWires,
        selectedIds: [],
      });
      syncSimulator(nextComponents, nextWires);
      pushHistory(nextComponents, nextWires);
    },

    addWire: (from: WireEndpoint, to: WireEndpoint, points: Point[]) => {
      // Avoid duplicate wire between same ports
      const existing = get().wires.find(
        w => (w.from.componentId === from.componentId && w.from.portId === from.portId &&
              w.to.componentId === to.componentId && w.to.portId === to.portId) ||
             (w.from.componentId === to.componentId && w.from.portId === to.portId &&
              w.to.componentId === from.componentId && w.to.portId === from.portId)
      );
      if (existing) return existing;

      const id = `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newWire: Wire = { id, from, to, points };
      const nextWires = [...get().wires, newWire];
      set({ wires: nextWires });
      syncSimulator(get().components, nextWires);
      pushHistory(get().components, nextWires);
      return newWire;
    },

    addJunctionAt: (position: Point) => {
      const meta = COMPONENT_METADATA.JUNCTION;
      const component: ComponentInstance = {
        id: `junction_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'JUNCTION',
        x: position.x - meta.width / 2,
        y: position.y - meta.height / 2,
        direction: 'EAST',
        label: meta.name,
        bitWidth: 1,
        state: {},
      };
      const nextComponents = [...get().components, component];
      set({ components: nextComponents, selectedIds: [component.id] });
      syncSimulator(nextComponents, get().wires);
      pushHistory(nextComponents, get().wires);
      return component;
    },

    removeWire: (wireId: string) => {
      const nextWires = get().wires.filter(w => w.id !== wireId);
      set({ wires: nextWires });
      syncSimulator(get().components, nextWires);
      pushHistory(get().components, nextWires);
    },

    setTool: (tool: ToolType) => {
      set({ tool, ...(tool === 'select' ? {} : { pendingComponentType: null }) });
    },

    setZoom: (zoomOrUpdater) => {
      const current = get().zoom;
      const nextZoom = typeof zoomOrUpdater === 'function' ? zoomOrUpdater(current) : zoomOrUpdater;
      const clamped = Math.max(0.2, Math.min(3, nextZoom));
      set({ zoom: clamped });
    },

    setPan: (panOrUpdater) => {
      const current = get().pan;
      const nextPan = typeof panOrUpdater === 'function' ? panOrUpdater(current) : panOrUpdater;
      set({ pan: nextPan });
    },

    togglePinValue: (componentId: string) => {
      const comp = get().components.find(c => c.id === componentId);
      if (!comp) return;

      if (comp.type === 'PIN_INPUT' || comp.type === 'SWITCH' || comp.type === 'BUTTON') {
        const currentVal = comp.state?.value || ['0'];
        const nextVal: BitVector = currentVal.map((v: string) => (v === '1' ? '0' : '1'));
        const nextComponents = get().components.map(c => {
          if (c.id === componentId) {
            return {
              ...c,
              state: { ...c.state, value: nextVal },
            };
          }
          return c;
        });

        set({ components: nextComponents });
        set({ navigationStack: updateNavigationStack(nextComponents, get().wires) });
        get().simulator.setPinValue(componentId, 'out', nextVal);
        get().simulator.step();
        const stateSynchronizedComponents = nextComponents.map(component => {
          if (!STATEFUL_COMPONENT_TYPES.has(component.type)) return component;
          const state = get().simulator.getComponentState(component.id);
          return state && JSON.stringify(state) !== JSON.stringify(component.state)
            ? { ...component, state }
            : component;
        });
        set({ components: stateSynchronizedComponents });
        set({ navigationStack: updateNavigationStack(stateSynchronizedComponents, get().wires) });
        pushHistory(stateSynchronizedComponents, get().wires);
      }
    },

    stepSimulation: () => {
      const sim = get().simulator;
      // Also advance any clock components
      let changedClock = false;
      const nextComponents = get().components.map(c => {
        if (c.type === 'CLOCK') {
          const cur = c.state?.value || ['0'];
          const next = [cur[0] === '1' ? '0' : '1'] as BitVector;
          sim.setPinValue(c.id, 'out', next);
          changedClock = true;
          return { ...c, state: { ...c.state, value: next } };
        }
        return c;
      });

      if (changedClock) {
        set({ components: nextComponents });
        set({ navigationStack: updateNavigationStack(nextComponents, get().wires) });
      }

      sim.step();
      let stateChanged = false;
      const stateSynchronizedComponents = nextComponents.map(component => {
        if (!STATEFUL_COMPONENT_TYPES.has(component.type)) return component;
        const state = sim.getComponentState(component.id);
        if (!state || JSON.stringify(state) === JSON.stringify(component.state)) return component;
        stateChanged = true;
        return { ...component, state };
      });
      const nextTick = get().ticks + 1;
      const { tracedSignals, signalHistory } = get();
      const sample: SignalTraceSample = {
        tick: nextTick,
        values: Object.fromEntries(tracedSignals.map(signal => [
          getSignalTraceKey(signal),
          sim.getNetValue(signal.componentId, signal.portId),
        ])),
      };
      set({
        ...(stateChanged ? { components: stateSynchronizedComponents } : {}),
        ticks: nextTick,
        signalHistory: tracedSignals.length
          ? [...signalHistory, sample].slice(-MAX_SIGNAL_HISTORY)
          : signalHistory,
      });
    },

    setRunning: (running: boolean) => {
      set({ isSimulating: running });
    },

    setClockFrequency: (freq: number) => {
      set({ clockFrequency: Math.max(0.1, Math.min(100, freq)) });
    },

    setTracedSignals: (signals: WireEndpoint[]) => {
      const uniqueSignals = [...new Map(
        signals.map(signal => [getSignalTraceKey(signal), signal])
      ).values()].slice(0, MAX_TRACED_SIGNALS);
      const sample: SignalTraceSample = {
        tick: get().ticks,
        values: Object.fromEntries(uniqueSignals.map(signal => [
          getSignalTraceKey(signal),
          get().simulator.getNetValue(signal.componentId, signal.portId),
        ])),
      };
      set({
        tracedSignals: uniqueSignals,
        signalHistory: uniqueSignals.length ? [sample] : [],
      });
    },

    resetCircuit: () => {
      const newSim = new Simulator();
      set({
        components: [],
        wires: [],
        selectedIds: [],
        pendingComponentType: null,
        ticks: 0,
        simulator: newSim,
        tracedSignals: [],
        signalHistory: [],
        navigationStack: [],
        history: [{ components: [], wires: [] }],
        historyIndex: 0,
      });
    },

    loadCircuit: (circuit: CircuitState) => {
      const newSim = new Simulator();
      newSim.setCircuit(circuit.components, circuit.wires);
      newSim.step();
      set({
        components: circuit.components,
        wires: circuit.wires,
        selectedIds: [],
        pendingComponentType: null,
        simulator: newSim,
        tracedSignals: [],
        signalHistory: [],
        navigationStack: [],
        history: [{ components: circuit.components, wires: circuit.wires }],
        historyIndex: 0,
      });
    },

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        const snapshot = history[nextIndex];
        set({
          components: JSON.parse(JSON.stringify(snapshot.components)),
          wires: JSON.parse(JSON.stringify(snapshot.wires)),
          historyIndex: nextIndex,
          selectedIds: [],
        });
        syncSimulator(snapshot.components, snapshot.wires);
      }
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        const snapshot = history[nextIndex];
        set({
          components: JSON.parse(JSON.stringify(snapshot.components)),
          wires: JSON.parse(JSON.stringify(snapshot.wires)),
          historyIndex: nextIndex,
          selectedIds: [],
        });
        syncSimulator(snapshot.components, snapshot.wires);
      }
    },
  };
});
