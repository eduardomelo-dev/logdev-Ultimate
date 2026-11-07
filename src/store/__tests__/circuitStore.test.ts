import { describe, it, expect, beforeEach } from 'vitest';
import { useCircuitStore } from '../circuitStore';

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
});
