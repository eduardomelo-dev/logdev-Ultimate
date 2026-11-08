import { create } from 'zustand';
import { COMPONENT_METADATA } from '../engine/components';
import { getComponentDimensions, getPortWorldPosition } from '../engine/componentGeometry';
import { Simulator } from '../engine/simulator';
import { routeOrthogonalWire } from '../canvas/wireRouter';
import {
  BitVector,
  CircuitState,
  ComponentInstance,
  ComponentType,
  Point,
  Wire,
  WireEndpoint
} from '../types/circuit';

export type ToolType = 'select' | 'poke' | 'wire' | 'delete';

interface HistorySnapshot {
  components: ComponentInstance[];
  wires: Wire[];
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
    history: [{ components: [], wires: [] }],
    historyIndex: 0,

    addComponent: (type: ComponentType, x: number, y: number) => {
      const id = `${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const meta = COMPONENT_METADATA[type];
      const initialBitWidth = type === 'REGISTER' ? 4 : type === 'HEX_DISPLAY' ? 4 : 1;
      const initialInputs = (type === 'AND' || type === 'OR' || type === 'NAND' || type === 'NOR' || type === 'XOR' || type === 'XNOR') ? 2 : undefined;

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
      const nextWires = updates.direction && updates.direction !== current.direction
        ? wires.map(wire => {
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
        get().simulator.setPinValue(componentId, 'out', nextVal);
        get().simulator.step();
        pushHistory(nextComponents, get().wires);
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
      }

      sim.step();
      set({ ticks: get().ticks + 1 });
    },

    setRunning: (running: boolean) => {
      set({ isSimulating: running });
    },

    setClockFrequency: (freq: number) => {
      set({ clockFrequency: Math.max(0.1, Math.min(100, freq)) });
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
