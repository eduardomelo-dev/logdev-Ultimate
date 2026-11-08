import { describe, it, expect, beforeEach } from 'vitest';
import { useCircuitStore } from '../circuitStore';
import { getPortWorldPosition } from '../../engine/componentGeometry';

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

  it('toggles input pin value in poke mode and steps simulation', () => {
    const store = useCircuitStore.getState();
    const pin = store.addComponent('PIN_INPUT', 0, 0);
    expect(pin.state?.value).toEqual(['0']);

    store.togglePinValue(pin.id);
    const updated = useCircuitStore.getState().components.find(c => c.id === pin.id);
    expect(updated?.state?.value).toEqual(['1']);
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
