import { describe, it, expect, beforeEach } from 'vitest';
import { useCircuitStore } from '../circuitStore';
import { getPortWorldPosition } from '../../engine/componentGeometry';
import { parseCircuitData } from '../../utils/circuitPersistence';

describe('Circuit Store', () => {
  beforeEach(() => {
    useCircuitStore.getState().resetCircuit();
  });

  it('adds a component and supports undo', () => {
    const store = useCircuitStore.getState();
    store.addComponent('AND', 100, 100);
    expect(useCircuitStore.getState().components.length).toBe(1);

    store.undo();
    expect(useCircuitStore.getState().components.length).toBe(0);

    store.redo();
    expect(useCircuitStore.getState().components.length).toBe(1);
  });

  it('connects wires and removes connected wire when component is deleted', () => {
    const store = useCircuitStore.getState();
    const c1 = store.addComponent('PIN_INPUT', 0, 0);
    const c2 = store.addComponent('LED', 100, 0);
    
    store.addWire(
      { componentId: c1.id, portId: 'out' },
      { componentId: c2.id, portId: 'in' },
      [{ x: 40, y: 20 }, { x: 100, y: 20 }]
    );
    expect(useCircuitStore.getState().wires.length).toBe(1);

    // Select and delete c1
    store.selectElement(c1.id, false);
    store.removeSelected();
    expect(useCircuitStore.getState().components.length).toBe(1);
    expect(useCircuitStore.getState().wires.length).toBe(0);
  });

  it('inserts a junction as an undoable component at the exact wire coordinate', () => {
    const store = useCircuitStore.getState();
    const junction = store.addJunctionAt({ x: 73, y: 58 });

    expect(junction).toMatchObject({ type: 'JUNCTION', x: 63, y: 48 });
    expect(getPortWorldPosition(junction, 'node')).toEqual({ x: 73, y: 58 });
    useCircuitStore.getState().undo();
    expect(useCircuitStore.getState().components).toHaveLength(0);
    useCircuitStore.getState().redo();
    expect(useCircuitStore.getState().components[0].type).toBe('JUNCTION');
  });

  it('toggles input pin value in poke mode and steps simulation', () => {
    const store = useCircuitStore.getState();
    const pin = store.addComponent('PIN_INPUT', 0, 0);
    expect(pin.state?.value).toEqual(['0']);

    store.togglePinValue(pin.id);
    const updated = useCircuitStore.getState().components.find(c => c.id === pin.id);
    expect(updated?.state?.value).toEqual(['1']);
  });

  it('records only selected signals and bounds chronogram history', () => {
    const store = useCircuitStore.getState();
    store.loadCircuit({
      components: [
        { id: 'input', type: 'PIN_INPUT', x: 0, y: 0, state: { value: ['1'] } },
        { id: 'output', type: 'PIN_OUTPUT', x: 80, y: 0 },
      ],
      wires: [{
        id: 'wire',
        from: { componentId: 'input', portId: 'out' },
        to: { componentId: 'output', portId: 'in' },
        points: [],
      }],
    });
    useCircuitStore.getState().setTracedSignals([{ componentId: 'input', portId: 'out' }]);

    expect(useCircuitStore.getState().signalHistory).toHaveLength(1);
    for (let tick = 0; tick < 305; tick++) {
      useCircuitStore.getState().stepSimulation();
    }

    const state = useCircuitStore.getState();
    expect(state.signalHistory).toHaveLength(300);
    expect(state.signalHistory[0].tick).toBe(6);
    expect(state.signalHistory[state.signalHistory.length - 1].tick).toBe(305);
    expect(Object.keys(state.signalHistory[0].values)).toEqual(['input:out']);
  });

  it('edits a subcircuit in isolation and keeps the root project updated', () => {
    const store = useCircuitStore.getState();
    store.loadCircuit({
      components: [{
        id: 'module',
        type: 'SUBCIRCUIT',
        x: 0,
        y: 0,
        label: 'Módulo',
        subcircuit: {
          name: 'Módulo',
          circuit: {
            components: [{ id: 'gate', type: 'AND', x: 40, y: 40, label: 'AND original' }],
            wires: [],
          },
          ports: [],
        },
      }],
      wires: [],
    });

    useCircuitStore.getState().enterSubcircuit('module');
    expect(useCircuitStore.getState().components.map(component => component.id)).toEqual(['gate']);
    useCircuitStore.getState().updateComponent('gate', { label: 'AND editado' });

    const projectWhileEditing = useCircuitStore.getState().getProjectCircuit();
    expect(projectWhileEditing.components[0].subcircuit?.circuit.components[0].label)
      .toBe('AND editado');

    useCircuitStore.getState().exitSubcircuit();
    expect(useCircuitStore.getState().components.map(component => component.id)).toEqual(['module']);
    expect(useCircuitStore.getState().components[0].subcircuit?.circuit.components[0].label)
      .toBe('AND editado');
  });

  it('rotates a connected component, keeps the wire attached, and undoes the rotation', () => {
    const store = useCircuitStore.getState();
    const pin = store.addComponent('PIN_INPUT', 0, 0);
    const gate = store.addComponent('AND', 120, 0);
    store.addWire(
      { componentId: pin.id, portId: 'out' },
      { componentId: gate.id, portId: 'in0' },
      [{ x: 40, y: 20 }, { x: 120, y: 17 }]
    );

    useCircuitStore.getState().updateComponent(gate.id, { direction: 'SOUTH' });
    const rotated = useCircuitStore.getState();
    const rotatedGate = rotated.components.find(component => component.id === gate.id)!;
    const rotatedWire = rotated.wires[0];
    expect(rotatedGate.direction).toBe('SOUTH');
    expect(rotatedWire.points[rotatedWire.points.length - 1])
      .toEqual(getPortWorldPosition(rotatedGate, 'in0'));

    rotated.undo();
    const undone = useCircuitStore.getState();
    const restoredGate = undone.components.find(component => component.id === gate.id)!;
    expect(restoredGate.direction).toBe('EAST');
    expect(undone.wires[0].points[undone.wires[0].points.length - 1])
      .toEqual(getPortWorldPosition(restoredGate, 'in0'));
  });

  it('reroutes connections when a configurable gate changes its port layout', () => {
    const store = useCircuitStore.getState();
    const inputA = store.addComponent('PIN_INPUT', 0, 0);
    const inputB = store.addComponent('PIN_INPUT', 0, 80);
    const gate = store.addComponent('AND', 120, 20);
    store.addWire(
      { componentId: inputA.id, portId: 'out' },
      { componentId: gate.id, portId: 'in0' },
      [{ x: 40, y: 20 }, { x: 120, y: 37 }]
    );
    store.addWire(
      { componentId: inputB.id, portId: 'out' },
      { componentId: gate.id, portId: 'in1' },
      [{ x: 40, y: 100 }, { x: 120, y: 53 }]
    );

    useCircuitStore.getState().updateComponent(gate.id, { inputs: 3 });
    const state = useCircuitStore.getState();
    const updatedGate = state.components.find(component => component.id === gate.id)!;
    expect(state.wires[0].points[state.wires[0].points.length - 1])
      .toEqual(getPortWorldPosition(updatedGate, 'in0'));
    expect(state.wires[1].points[state.wires[1].points.length - 1])
      .toEqual(getPortWorldPosition(updatedGate, 'in1'));
  });

  it('removes wires to ports that disappear when a multiplexer is reduced', () => {
    const store = useCircuitStore.getState();
    const mux = store.addComponent('MULTIPLEXER', 120, 40);
    const source = useCircuitStore.getState().addComponent('PIN_INPUT', 0, 40);
    useCircuitStore.getState().updateComponent(mux.id, { inputs: 4 });
    useCircuitStore.getState().addWire(
      { componentId: source.id, portId: 'out' },
      { componentId: mux.id, portId: 'in3' },
      [{ x: 40, y: 60 }, { x: 120, y: 100 }]
    );
    expect(useCircuitStore.getState().wires).toHaveLength(1);

    useCircuitStore.getState().updateComponent(mux.id, { inputs: 2 });
    const circuit = {
      components: useCircuitStore.getState().components,
      wires: useCircuitStore.getState().wires,
    };
    expect(circuit.wires).toHaveLength(0);
    expect(() => parseCircuitData(circuit)).not.toThrow();
  });

  it('pastes selected components and their internal wires as one undoable edit', () => {
    const store = useCircuitStore.getState();
    const input = store.addComponent('PIN_INPUT', 0, 0);
    const output = store.addComponent('PIN_OUTPUT', 100, 0);
    const wire = store.addWire(
      { componentId: input.id, portId: 'out' },
      { componentId: output.id, portId: 'in' },
      [{ x: 40, y: 20 }, { x: 100, y: 20 }]
    );

    useCircuitStore.getState().pasteCircuit(
      { components: [input, output], wires: [wire] },
      { x: 200, y: 80 }
    );

    const pasted = useCircuitStore.getState();
    expect(pasted.components).toHaveLength(4);
    expect(pasted.wires).toHaveLength(2);
    const pastedComponents = pasted.components.slice(2);
    const pastedWire = pasted.wires[1];
    expect(pastedComponents.map(component => [component.x, component.y])).toEqual([[200, 80], [300, 80]]);
    expect(pastedWire.from.componentId).toBe(pastedComponents[0].id);
    expect(pastedWire.to.componentId).toBe(pastedComponents[1].id);
    expect(pastedWire.points).toEqual([{ x: 240, y: 100 }, { x: 300, y: 100 }]);

    pasted.undo();
    expect(useCircuitStore.getState().components).toHaveLength(2);
    expect(useCircuitStore.getState().wires).toHaveLength(1);
  });

  it('moves a component group and reroutes its wires in one undoable edit', () => {
    const store = useCircuitStore.getState();
    const input = store.addComponent('PIN_INPUT', 0, 0);
    const gate = store.addComponent('AND', 120, 0);
    store.addWire(
      { componentId: input.id, portId: 'out' },
      { componentId: gate.id, portId: 'in0' },
      [{ x: 40, y: 20 }, { x: 120, y: 17 }]
    );

    useCircuitStore.getState().moveComponents([
      { id: input.id, x: 40, y: 60 },
      { id: gate.id, x: 160, y: 60 },
    ]);

    const moved = useCircuitStore.getState();
    expect(moved.components.map(component => [component.x, component.y])).toEqual([[40, 60], [160, 60]]);
    expect(moved.wires[0].points[moved.wires[0].points.length - 1])
      .toEqual(getPortWorldPosition(moved.components[1], 'in0'));

    moved.undo();
    expect(useCircuitStore.getState().components.map(component => [component.x, component.y]))
      .toEqual([[0, 0], [120, 0]]);
  });
});
