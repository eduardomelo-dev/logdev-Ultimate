import { describe, it, expect } from 'vitest';
import { Simulator } from '../simulator';
import { ComponentInstance, Wire } from '../../types/circuit';

describe('Simulator Engine', () => {
  it('propagates values through an AND gate circuit', () => {
    const sim = new Simulator();
    const pinA: ComponentInstance = { id: 'pinA', type: 'PIN_INPUT', x: 0, y: 0, state: { value: ['1'] } };
    const pinB: ComponentInstance = { id: 'pinB', type: 'PIN_INPUT', x: 0, y: 40, state: { value: ['1'] } };
    const andGate: ComponentInstance = { id: 'and1', type: 'AND', x: 80, y: 20, state: { inputs: 2 } };
    const probe: ComponentInstance = { id: 'probe1', type: 'PROBE', x: 160, y: 20, state: {} };

    const wires: Wire[] = [
      { id: 'w1', from: { componentId: 'pinA', portId: 'out' }, to: { componentId: 'and1', portId: 'in0' }, points: [] },
      { id: 'w2', from: { componentId: 'pinB', portId: 'out' }, to: { componentId: 'and1', portId: 'in1' }, points: [] },
      { id: 'w3', from: { componentId: 'and1', portId: 'out' }, to: { componentId: 'probe1', portId: 'in' }, points: [] },
    ];

    sim.setCircuit([pinA, pinB, andGate, probe], wires);
    sim.step();
    expect(sim.getPinValue('probe1', 'in')).toEqual(['1']);

    // Toggle Pin A to 0
    sim.setPinValue('pinA', 'out', ['0']);
    sim.step();
    expect(sim.getPinValue('probe1', 'in')).toEqual(['0']);
  });

  it('evaluates Multiplexer correctly', () => {
    const sim = new Simulator();
    const pin0: ComponentInstance = { id: 'p0', type: 'PIN_INPUT', x: 0, y: 0, state: { value: ['0'] } };
    const pin1: ComponentInstance = { id: 'p1', type: 'PIN_INPUT', x: 0, y: 20, state: { value: ['1'] } };
    const sel: ComponentInstance = { id: 'sel', type: 'PIN_INPUT', x: 0, y: 40, state: { value: ['0'] } };
    const mux: ComponentInstance = { id: 'mux1', type: 'MULTIPLEXER', x: 60, y: 20, state: {} };
    const probe: ComponentInstance = { id: 'outProbe', type: 'PROBE', x: 120, y: 20, state: {} };

    const wires: Wire[] = [
      { id: 'w1', from: { componentId: 'p0', portId: 'out' }, to: { componentId: 'mux1', portId: 'in0' }, points: [] },
      { id: 'w2', from: { componentId: 'p1', portId: 'out' }, to: { componentId: 'mux1', portId: 'in1' }, points: [] },
      { id: 'w3', from: { componentId: 'sel', portId: 'out' }, to: { componentId: 'mux1', portId: 'sel' }, points: [] },
      { id: 'w4', from: { componentId: 'mux1', portId: 'out' }, to: { componentId: 'outProbe', portId: 'in' }, points: [] },
    ];

    sim.setCircuit([pin0, pin1, sel, mux, probe], wires);
    sim.step();
    expect(sim.getPinValue('outProbe', 'in')).toEqual(['0']);

    // Change select to 1
    sim.setPinValue('sel', 'out', ['1']);
    sim.step();
    expect(sim.getPinValue('outProbe', 'in')).toEqual(['1']);
  });

  it('handles feedback loop oscillation safely without freezing', () => {
    const sim = new Simulator();
    // NOT gate connected directly to itself
    const notGate: ComponentInstance = { id: 'not1', type: 'NOT', x: 40, y: 40, state: {} };
    const wire: Wire = {
      id: 'wLoop',
      from: { componentId: 'not1', portId: 'out' },
      to: { componentId: 'not1', portId: 'in' },
      points: []
    };

    sim.setCircuit([notGate], [wire]);
    // Should step and finish cleanly due to iteration limits
    expect(() => sim.step()).not.toThrow();
  });
});
