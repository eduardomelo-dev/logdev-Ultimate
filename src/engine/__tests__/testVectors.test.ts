import { describe, expect, it } from 'vitest';
import { runTestVectors, TestVector } from '../testVectors';
import { CircuitState } from '../../types/circuit';

const andCircuit: CircuitState = {
  components: [
    { id: 'a', type: 'PIN_INPUT', x: 0, y: 0, state: { value: ['1'] } },
    { id: 'b', type: 'PIN_INPUT', x: 0, y: 40, state: { value: ['1'] } },
    { id: 'gate', type: 'AND', x: 80, y: 0, inputs: 2 },
    { id: 'y', type: 'PIN_OUTPUT', x: 160, y: 0 },
  ],
  wires: [
    { id: 'a-gate', from: { componentId: 'a', portId: 'out' }, to: { componentId: 'gate', portId: 'in0' }, points: [] },
    { id: 'b-gate', from: { componentId: 'b', portId: 'out' }, to: { componentId: 'gate', portId: 'in1' }, points: [] },
    { id: 'gate-y', from: { componentId: 'gate', portId: 'out' }, to: { componentId: 'y', portId: 'in' }, points: [] },
  ],
};

describe('Test vector execution', () => {
  it('reports pass and fail results for each combinational vector', () => {
    const vectors: TestVector[] = [
      { inputs: { a: '0', b: '0' }, expectedOutputs: { y: '0' } },
      { inputs: { a: '1', b: '1' }, expectedOutputs: { y: '1' } },
      { inputs: { a: '1', b: '0' }, expectedOutputs: { y: '1' } },
    ];

    expect(runTestVectors(andCircuit, vectors)).toEqual([
      { actualOutputs: { y: '0' }, passed: true },
      { actualOutputs: { y: '1' }, passed: true },
      { actualOutputs: { y: '0' }, passed: false },
    ]);
  });

  it('preserves sequential state across rows while leaving the circuit untouched', () => {
    const circuit: CircuitState = {
      components: [
        { id: 'd', type: 'PIN_INPUT', x: 0, y: 0, state: { value: ['0'] } },
        { id: 'clk', type: 'CLOCK', x: 0, y: 40, state: { value: ['0'] } },
        { id: 'ff', type: 'D_FLIP_FLOP', x: 80, y: 0, state: { q: '0' } },
        { id: 'q', type: 'PIN_OUTPUT', x: 160, y: 0 },
      ],
      wires: [
        { id: 'd-ff', from: { componentId: 'd', portId: 'out' }, to: { componentId: 'ff', portId: 'd' }, points: [] },
        { id: 'clk-ff', from: { componentId: 'clk', portId: 'out' }, to: { componentId: 'ff', portId: 'clk' }, points: [] },
        { id: 'ff-q', from: { componentId: 'ff', portId: 'q' }, to: { componentId: 'q', portId: 'in' }, points: [] },
      ],
    };
    const vectors: TestVector[] = [
      { inputs: { d: '0', clk: '0' }, expectedOutputs: { q: '0' } },
      { inputs: { d: '1', clk: '0' }, expectedOutputs: { q: '0' } },
      { inputs: { d: '1', clk: '1' }, expectedOutputs: { q: '1' } },
    ];

    expect(runTestVectors(circuit, vectors).map(result => result.passed)).toEqual([true, true, true]);
    expect(circuit.components[0].state?.value).toEqual(['0']);
    expect(circuit.components[1].state?.value).toEqual(['0']);
    expect(circuit.components[2].state?.q).toBe('0');
  });
});
