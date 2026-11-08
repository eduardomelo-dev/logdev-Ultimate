import { describe, it, expect } from 'vitest';
import { clockCounterDemo, fullAdderDemo, srLatchDemo } from '../demos/sampleCircuits';
import { Simulator } from '../engine/simulator';
import { parseCircuitData } from '../utils/circuitPersistence';

describe('Demo Circuits', () => {
  it('validates every shipped demo circuit as an importable project', () => {
    expect(() => parseCircuitData(fullAdderDemo)).not.toThrow();
    expect(() => parseCircuitData(srLatchDemo)).not.toThrow();
    expect(() => parseCircuitData(clockCounterDemo)).not.toThrow();
  });

  it('computes 1 + 1 = Sum 0, Cout 1 in Full Adder demo', () => {
    const sim = new Simulator();
    sim.setCircuit(fullAdderDemo.components, fullAdderDemo.wires);
    // Set A=1, B=1, Cin=0
    sim.setPinValue('pinA', 'out', ['1']);
    sim.setPinValue('pinB', 'out', ['1']);
    sim.setPinValue('pinCin', 'out', ['0']);
    sim.step();
    expect(sim.getPinValue('sumOut', 'in')).toEqual(['0']);
    expect(sim.getPinValue('coutOut', 'in')).toEqual(['1']);
  });

  it('sets and resets state in SR Latch demo', () => {
    const sim = new Simulator();
    sim.setCircuit(srLatchDemo.components, srLatchDemo.wires);
    // Set S=1, R=0
    sim.setPinValue('pinS', 'out', ['1']);
    sim.setPinValue('pinR', 'out', ['0']);
    sim.step();
    expect(sim.getPinValue('probeQ', 'in')).toEqual(['1']);
    expect(sim.getPinValue('probeQBar', 'in')).toEqual(['0']);
  });

  it('counts binary pulses in Clock Counter demo', () => {
    const sim = new Simulator();
    sim.setCircuit(clockCounterDemo.components, clockCounterDemo.wires);
    sim.step();

    // Pulse 1: 0 -> 1 -> 0
    sim.setPinValue('clk1', 'out', ['1']);
    sim.step();
    sim.setPinValue('clk1', 'out', ['0']);
    sim.step();

    // Bit 0 should toggle to 1
    expect(sim.getPinValue('led1', 'in')).toEqual(['1']);
  });
});
