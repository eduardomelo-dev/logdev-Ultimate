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

  it('clears stale input values after a connected wire is removed', () => {
    const sim = new Simulator();
    const source: ComponentInstance = {
      id: 'source',
      type: 'PIN_INPUT',
      x: 0,
      y: 0,
      state: { value: ['1'] },
    };
    const inverter: ComponentInstance = { id: 'inverter', type: 'NOT', x: 80, y: 0 };
    const output: ComponentInstance = { id: 'output', type: 'PIN_OUTPUT', x: 160, y: 0 };
    const inputWire: Wire = {
      id: 'input-wire',
      from: { componentId: source.id, portId: 'out' },
      to: { componentId: inverter.id, portId: 'in' },
      points: [],
    };
    const outputWire: Wire = {
      id: 'output-wire',
      from: { componentId: inverter.id, portId: 'out' },
      to: { componentId: output.id, portId: 'in' },
      points: [],
    };

    sim.setCircuit([source, inverter, output], [inputWire, outputWire]);
    sim.step();
    expect(sim.getPinValue(output.id, 'in')).toEqual(['0']);

    sim.setCircuit([source, inverter, output], [outputWire]);
    sim.step();
    expect(sim.getPinValue(inverter.id, 'in')).toEqual(['Z']);
    expect(sim.getPinValue(output.id, 'in')).toEqual(['X']);
  });

  it('uses the circuit state as the source of truth when a project snapshot is restored', () => {
    const sim = new Simulator();
    const input: ComponentInstance = {
      id: 'input',
      type: 'PIN_INPUT',
      x: 0,
      y: 0,
      state: { value: ['1'] },
    };
    const output: ComponentInstance = { id: 'output', type: 'PIN_OUTPUT', x: 80, y: 0 };
    const wire: Wire = {
      id: 'wire',
      from: { componentId: input.id, portId: 'out' },
      to: { componentId: output.id, portId: 'in' },
      points: [],
    };

    sim.setCircuit([input, output], [wire]);
    sim.step();
    expect(sim.getPinValue(output.id, 'in')).toEqual(['1']);

    sim.setCircuit([
      { ...input, state: { value: ['0'] } },
      output,
    ], [wire]);
    sim.step();
    expect(sim.getPinValue(output.id, 'in')).toEqual(['0']);
  });

  it('supports component identifiers containing colons in netlist endpoints', () => {
    const sim = new Simulator();
    const input: ComponentInstance = {
      id: 'source:west',
      type: 'PIN_INPUT',
      x: 0,
      y: 0,
      state: { value: ['1'] },
    };
    const output: ComponentInstance = { id: 'lamp:out', type: 'PIN_OUTPUT', x: 80, y: 0 };
    const wire: Wire = {
      id: 'wire',
      from: { componentId: input.id, portId: 'out' },
      to: { componentId: output.id, portId: 'in' },
      points: [],
    };

    sim.setCircuit([input, output], [wire]);
    sim.step();
    expect(sim.getPinValue(output.id, 'in')).toEqual(['1']);
  });

  it('adds multi-bit operands with carry-in and reports carry-out', () => {
    const sim = new Simulator();
    const operandA: ComponentInstance = {
      id: 'a',
      type: 'PIN_INPUT',
      x: 0,
      y: 0,
      bitWidth: 4,
      state: { value: ['1', '1', '1', '1'] },
    };
    const operandB: ComponentInstance = {
      id: 'b',
      type: 'PIN_INPUT',
      x: 0,
      y: 80,
      bitWidth: 4,
      state: { value: ['1', '0', '0', '0'] },
    };
    const carryIn: ComponentInstance = {
      id: 'carry-in',
      type: 'PIN_INPUT',
      x: 0,
      y: 140,
      state: { value: ['0'] },
    };
    const adder: ComponentInstance = { id: 'adder', type: 'ADDER', x: 100, y: 40, bitWidth: 4 };
    const sum: ComponentInstance = { id: 'sum', type: 'PIN_OUTPUT', x: 220, y: 40, bitWidth: 4 };
    const carryOut: ComponentInstance = { id: 'carry-out', type: 'PIN_OUTPUT', x: 220, y: 100 };
    const wires: Wire[] = [
      { id: 'a-adder', from: { componentId: 'a', portId: 'out' }, to: { componentId: 'adder', portId: 'a' }, points: [] },
      { id: 'b-adder', from: { componentId: 'b', portId: 'out' }, to: { componentId: 'adder', portId: 'b' }, points: [] },
      { id: 'carry-adder', from: { componentId: 'carry-in', portId: 'out' }, to: { componentId: 'adder', portId: 'carryIn' }, points: [] },
      { id: 'adder-sum', from: { componentId: 'adder', portId: 'sum' }, to: { componentId: 'sum', portId: 'in' }, points: [] },
      { id: 'adder-carry', from: { componentId: 'adder', portId: 'carryOut' }, to: { componentId: 'carry-out', portId: 'in' }, points: [] },
    ];

    sim.setCircuit([operandA, operandB, carryIn, adder, sum, carryOut], wires);
    sim.step();

    expect(sim.getPinValue('sum', 'in')).toEqual(['0', '0', '0', '0']);
    expect(sim.getPinValue('carry-out', 'in')).toEqual(['1']);
  });

  it('propagates indeterminate input through the adder instead of fabricating a result', () => {
    const sim = new Simulator();
    const a: ComponentInstance = {
      id: 'a',
      type: 'PIN_INPUT',
      x: 0,
      y: 0,
      bitWidth: 2,
      state: { value: ['1', 'X'] },
    };
    const b: ComponentInstance = {
      id: 'b',
      type: 'PIN_INPUT',
      x: 0,
      y: 60,
      bitWidth: 2,
      state: { value: ['0', '0'] },
    };
    const adder: ComponentInstance = { id: 'adder', type: 'ADDER', x: 80, y: 0, bitWidth: 2 };
    const output: ComponentInstance = { id: 'output', type: 'PIN_OUTPUT', x: 200, y: 0, bitWidth: 2 };
    const carry: ComponentInstance = { id: 'carry', type: 'PIN_INPUT', x: 0, y: 120, state: { value: ['0'] } };
    const wires: Wire[] = [
      { id: 'a-adder', from: { componentId: 'a', portId: 'out' }, to: { componentId: 'adder', portId: 'a' }, points: [] },
      { id: 'b-adder', from: { componentId: 'b', portId: 'out' }, to: { componentId: 'adder', portId: 'b' }, points: [] },
      { id: 'carry-adder', from: { componentId: 'carry', portId: 'out' }, to: { componentId: 'adder', portId: 'carryIn' }, points: [] },
      { id: 'adder-output', from: { componentId: 'adder', portId: 'sum' }, to: { componentId: 'output', portId: 'in' }, points: [] },
    ];

    sim.setCircuit([a, b, adder, output, carry], wires);
    sim.step();
    expect(sim.getPinValue('output', 'in')).toEqual(['X', 'X']);
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

  it('routes all inputs through a configurable 4-to-1 multiplexer', () => {
    const sim = new Simulator();
    const dataPins: ComponentInstance[] = [0, 1, 0, 1].map((value, index) => ({
      id: `data-${index}`,
      type: 'PIN_INPUT',
      x: 0,
      y: index * 40,
      state: { value: [value ? '1' : '0'] },
    }));
    const selector: ComponentInstance = {
      id: 'selector',
      type: 'PIN_INPUT',
      x: 0,
      y: 180,
      bitWidth: 2,
      state: { value: ['0', '0'] },
    };
    const mux: ComponentInstance = {
      id: 'mux',
      type: 'MULTIPLEXER',
      x: 100,
      y: 0,
      inputs: 4,
    };
    const output: ComponentInstance = { id: 'output', type: 'PIN_OUTPUT', x: 180, y: 0 };
    const wires: Wire[] = [
      ...dataPins.map((pin, index): Wire => ({
        id: `data-${index}-mux`,
        from: { componentId: pin.id, portId: 'out' },
        to: { componentId: mux.id, portId: `in${index}` },
        points: [],
      })),
      {
        id: 'selector-mux',
        from: { componentId: selector.id, portId: 'out' },
        to: { componentId: mux.id, portId: 'sel' },
        points: [],
      },
      {
        id: 'mux-output',
        from: { componentId: mux.id, portId: 'out' },
        to: { componentId: output.id, portId: 'in' },
        points: [],
      },
    ];
    sim.setCircuit([...dataPins, selector, mux, output], wires);

    for (let index = 0; index < 4; index++) {
      sim.setPinValue('selector', 'out', [index & 1 ? '1' : '0', index & 2 ? '1' : '0']);
      sim.step();
      expect(sim.getPinValue('output', 'in')).toEqual([index % 2 ? '1' : '0']);
    }
  });

  it('selects a whole multi-bit data bus through a multiplexer', () => {
    const sim = new Simulator();
    const dataA: ComponentInstance = {
      id: 'data-a',
      type: 'PIN_INPUT',
      x: 0,
      y: 0,
      bitWidth: 4,
      state: { value: ['1', '0', '1', '0'] },
    };
    const dataB: ComponentInstance = {
      id: 'data-b',
      type: 'PIN_INPUT',
      x: 0,
      y: 60,
      bitWidth: 4,
      state: { value: ['0', '1', '0', '1'] },
    };
    const selector: ComponentInstance = {
      id: 'selector',
      type: 'PIN_INPUT',
      x: 0,
      y: 120,
      state: { value: ['1'] },
    };
    const mux: ComponentInstance = {
      id: 'mux',
      type: 'MULTIPLEXER',
      x: 100,
      y: 0,
      inputs: 2,
      bitWidth: 4,
    };
    const output: ComponentInstance = {
      id: 'output',
      type: 'PIN_OUTPUT',
      x: 180,
      y: 0,
      bitWidth: 4,
    };
    const wires: Wire[] = [
      { id: 'a-mux', from: { componentId: dataA.id, portId: 'out' }, to: { componentId: mux.id, portId: 'in0' }, points: [] },
      { id: 'b-mux', from: { componentId: dataB.id, portId: 'out' }, to: { componentId: mux.id, portId: 'in1' }, points: [] },
      { id: 'selector-mux', from: { componentId: selector.id, portId: 'out' }, to: { componentId: mux.id, portId: 'sel' }, points: [] },
      { id: 'mux-output', from: { componentId: mux.id, portId: 'out' }, to: { componentId: output.id, portId: 'in' }, points: [] },
    ];
    sim.setCircuit([dataA, dataB, selector, mux, output], wires);
    sim.step();
    expect(sim.getPinValue(output.id, 'in')).toEqual(['0', '1', '0', '1']);
  });

  it('routes a demultiplexer input only to the selected output', () => {
    const sim = new Simulator();
    const input: ComponentInstance = {
      id: 'input',
      type: 'PIN_INPUT',
      x: 0,
      y: 0,
      state: { value: ['1'] },
    };
    const selector: ComponentInstance = {
      id: 'selector',
      type: 'PIN_INPUT',
      x: 0,
      y: 100,
      bitWidth: 2,
      state: { value: ['1', '0'] },
    };
    const demux: ComponentInstance = {
      id: 'demux',
      type: 'DEMULTIPLEXER',
      x: 100,
      y: 0,
      inputs: 4,
    };
    const outputs = Array.from({ length: 4 }, (_, index): ComponentInstance => ({
      id: `output-${index}`,
      type: 'PIN_OUTPUT',
      x: 180,
      y: index * 40,
    }));
    const wires: Wire[] = [
      { id: 'input-demux', from: { componentId: input.id, portId: 'out' }, to: { componentId: demux.id, portId: 'in' }, points: [] },
      { id: 'selector-demux', from: { componentId: selector.id, portId: 'out' }, to: { componentId: demux.id, portId: 'sel' }, points: [] },
      ...outputs.map((pin, index): Wire => ({
        id: `demux-output-${index}`,
        from: { componentId: demux.id, portId: `out${index}` },
        to: { componentId: pin.id, portId: 'in' },
        points: [],
      })),
    ];
    sim.setCircuit([input, selector, demux, ...outputs], wires);
    sim.step();

    expect(outputs.map(pin => sim.getPinValue(pin.id, 'in'))).toEqual([
      ['0'],
      ['1'],
      ['0'],
      ['0'],
    ]);
  });

  it('decodes an address to one active output and honors enable', () => {
    const sim = new Simulator();
    const address: ComponentInstance = {
      id: 'address',
      type: 'PIN_INPUT',
      x: 0,
      y: 0,
      bitWidth: 2,
      state: { value: ['1', '0'] },
    };
    const enable: ComponentInstance = {
      id: 'enable',
      type: 'PIN_INPUT',
      x: 0,
      y: 60,
      state: { value: ['1'] },
    };
    const decoder: ComponentInstance = { id: 'decoder', type: 'DECODER', x: 100, y: 0, bitWidth: 2 };
    const outputs = Array.from({ length: 4 }, (_, index): ComponentInstance => ({
      id: `decoded-${index}`,
      type: 'PIN_OUTPUT',
      x: 200,
      y: index * 40,
    }));
    const wires: Wire[] = [
      { id: 'address-decoder', from: { componentId: address.id, portId: 'out' }, to: { componentId: decoder.id, portId: 'sel' }, points: [] },
      { id: 'enable-decoder', from: { componentId: enable.id, portId: 'out' }, to: { componentId: decoder.id, portId: 'enable' }, points: [] },
      ...outputs.map((pin, index): Wire => ({
        id: `decoded-wire-${index}`,
        from: { componentId: decoder.id, portId: `out${index}` },
        to: { componentId: pin.id, portId: 'in' },
        points: [],
      })),
    ];
    sim.setCircuit([address, enable, decoder, ...outputs], wires);
    sim.step();
    expect(outputs.map(pin => sim.getPinValue(pin.id, 'in'))).toEqual([
      ['0'],
      ['1'],
      ['0'],
      ['0'],
    ]);

    sim.setPinValue(enable.id, 'out', ['0']);
    sim.step();
    expect(outputs.map(pin => sim.getPinValue(pin.id, 'in'))).toEqual([
      ['0'],
      ['0'],
      ['0'],
      ['0'],
    ]);
  });

  it('selects the highest active priority and marks uncertain winners', () => {
    const sim = new Simulator();
    const requests: ComponentInstance = {
      id: 'requests',
      type: 'PIN_INPUT',
      x: 0,
      y: 0,
      bitWidth: 4,
      state: { value: ['1', '0', '1', '1'] },
    };
    const encoder: ComponentInstance = {
      id: 'encoder',
      type: 'PRIORITY_ENCODER',
      x: 100,
      y: 0,
      bitWidth: 4,
    };
    const code: ComponentInstance = { id: 'code', type: 'PIN_OUTPUT', x: 220, y: 0, bitWidth: 2 };
    const valid: ComponentInstance = { id: 'valid', type: 'PIN_OUTPUT', x: 220, y: 60 };
    const wires: Wire[] = [
      { id: 'requests-encoder', from: { componentId: requests.id, portId: 'out' }, to: { componentId: encoder.id, portId: 'in' }, points: [] },
      { id: 'encoder-code', from: { componentId: encoder.id, portId: 'code' }, to: { componentId: code.id, portId: 'in' }, points: [] },
      { id: 'encoder-valid', from: { componentId: encoder.id, portId: 'valid' }, to: { componentId: valid.id, portId: 'in' }, points: [] },
    ];
    sim.setCircuit([requests, encoder, code, valid], wires);
    sim.step();
    expect(sim.getPinValue(code.id, 'in')).toEqual(['1', '1']);
    expect(sim.getPinValue(valid.id, 'in')).toEqual(['1']);

    sim.setPinValue(requests.id, 'out', ['1', '0', '0', 'X']);
    sim.step();
    expect(sim.getPinValue(code.id, 'in')).toEqual(['X', 'X']);
    expect(sim.getPinValue(valid.id, 'in')).toEqual(['1']);

    sim.setPinValue(requests.id, 'out', ['0', '0', '0', '0']);
    sim.step();
    expect(sim.getPinValue(code.id, 'in')).toEqual(['0', '0']);
    expect(sim.getPinValue(valid.id, 'in')).toEqual(['0']);
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

  it('resolves wire contention to X across all net endpoints', () => {
    const sim = new Simulator();
    const pinA: ComponentInstance = { id: 'pinA', type: 'PIN_INPUT', x: 0, y: 0, state: { value: ['1'] } };
    const pinB: ComponentInstance = { id: 'pinB', type: 'PIN_INPUT', x: 0, y: 40, state: { value: ['0'] } };
    const wire: Wire = {
      id: 'wContention',
      from: { componentId: 'pinA', portId: 'out' },
      to: { componentId: 'pinB', portId: 'out' },
      points: []
    };

    sim.setCircuit([pinA, pinB], [wire]);
    sim.step();
    expect(sim.getNetValue('pinA', 'out')).toEqual(['X']);
    expect(sim.getDiagnostics().some(diagnostic => diagnostic.type === 'contention')).toBe(true);
  });

  it('keeps connected but undriven input ports floating instead of reporting contention', () => {
    const sim = new Simulator();
    const inputA: ComponentInstance = { id: 'input-a', type: 'PIN_OUTPUT', x: 0, y: 0 };
    const inputB: ComponentInstance = { id: 'input-b', type: 'PIN_OUTPUT', x: 80, y: 0 };
    const wire: Wire = {
      id: 'wire',
      from: { componentId: inputA.id, portId: 'in' },
      to: { componentId: inputB.id, portId: 'in' },
      points: [],
    };

    sim.setCircuit([inputA, inputB], [wire]);
    sim.step();

    expect(sim.getPinValue(inputA.id, 'in')).toEqual(['Z']);
    expect(sim.getPinValue(inputB.id, 'in')).toEqual(['Z']);
    expect(sim.getDiagnostics().some(diagnostic => diagnostic.type === 'contention')).toBe(false);
  });

  it('joins a branch to a wire only at an explicit junction', () => {
    const source: ComponentInstance = {
      id: 'source',
      type: 'PIN_INPUT',
      x: 0,
      y: 30,
      state: { value: ['1'] },
    };
    const mainOutput: ComponentInstance = { id: 'main-output', type: 'PIN_OUTPUT', x: 120, y: 30 };
    const branchOutput: ComponentInstance = { id: 'branch-output', type: 'PIN_OUTPUT', x: 60, y: 80 };
    const junction: ComponentInstance = {
      id: 'junction',
      type: 'JUNCTION',
      x: 50,
      y: 40,
      bitWidth: 1,
    };
    const mainWire: Wire = {
      id: 'main-wire',
      from: { componentId: source.id, portId: 'out' },
      to: { componentId: mainOutput.id, portId: 'in' },
      points: [{ x: 40, y: 50 }, { x: 120, y: 50 }],
    };
    const branchWire: Wire = {
      id: 'branch-wire',
      from: { componentId: junction.id, portId: 'node' },
      to: { componentId: branchOutput.id, portId: 'in' },
      points: [{ x: 60, y: 50 }, { x: 60, y: 100 }],
    };
    const sim = new Simulator();

    sim.setCircuit([source, mainOutput, branchOutput, junction], [mainWire, branchWire]);
    sim.step();
    expect(sim.getPinValue(mainOutput.id, 'in')).toEqual(['1']);
    expect(sim.getPinValue(branchOutput.id, 'in')).toEqual(['1']);
  });

  it('does not electrically join crossing wires unless a junction is present', () => {
    const horizontalSource: ComponentInstance = {
      id: 'horizontal-source',
      type: 'PIN_INPUT',
      x: 0,
      y: 20,
      state: { value: ['1'] },
    };
    const horizontalSink: ComponentInstance = { id: 'horizontal-sink', type: 'PIN_OUTPUT', x: 120, y: 20 };
    const verticalSource: ComponentInstance = {
      id: 'vertical-source',
      type: 'PIN_INPUT',
      x: 40,
      y: 0,
      state: { value: ['0'] },
    };
    const verticalSink: ComponentInstance = { id: 'vertical-sink', type: 'PIN_OUTPUT', x: 40, y: 120 };
    const horizontalWire: Wire = {
      id: 'horizontal-wire',
      from: { componentId: horizontalSource.id, portId: 'out' },
      to: { componentId: horizontalSink.id, portId: 'in' },
      points: [{ x: 40, y: 40 }, { x: 100, y: 40 }],
    };
    const verticalWire: Wire = {
      id: 'vertical-wire',
      from: { componentId: verticalSource.id, portId: 'out' },
      to: { componentId: verticalSink.id, portId: 'in' },
      points: [{ x: 50, y: 20 }, { x: 50, y: 140 }],
    };
    const sim = new Simulator();

    sim.setCircuit(
      [horizontalSource, horizontalSink, verticalSource, verticalSink],
      [horizontalWire, verticalWire]
    );
    sim.step();
    expect(sim.getPinValue(horizontalSink.id, 'in')).toEqual(['1']);
    expect(sim.getPinValue(verticalSink.id, 'in')).toEqual(['0']);

    const junction: ComponentInstance = {
      id: 'crossing-junction',
      type: 'JUNCTION',
      x: 40,
      y: 30,
      bitWidth: 1,
    };
    sim.setCircuit(
      [horizontalSource, horizontalSink, verticalSource, verticalSink, junction],
      [horizontalWire, verticalWire]
    );
    sim.step();
    expect(sim.getPinValue(horizontalSink.id, 'in')).toEqual(['X']);
    expect(sim.getPinValue(verticalSink.id, 'in')).toEqual(['X']);
  });

  it('detects bus width mismatch and flags error X', () => {
    const sim = new Simulator();
    const pin1: ComponentInstance = { id: 'pin1', type: 'PIN_INPUT', x: 0, y: 0, bitWidth: 1, state: { value: ['1'] } };
    const pin4: ComponentInstance = { id: 'pin4', type: 'PIN_OUTPUT', x: 60, y: 0, bitWidth: 4, state: {} };
    const wire: Wire = {
      id: 'wMismatch',
      from: { componentId: 'pin1', portId: 'out' },
      to: { componentId: 'pin4', portId: 'in' },
      points: []
    };

    sim.setCircuit([pin1, pin4], [wire]);
    sim.step();
    expect(sim.getNetValue('pin1', 'out')).toEqual(['X']);
    expect(sim.getPinValue('pin4', 'in')).toEqual(['X', 'X', 'X', 'X']);
    expect(sim.getDiagnostics().some(diagnostic => diagnostic.type === 'width-mismatch')).toBe(true);
  });

  it('simulates Splitter component correctly', () => {
    const sim = new Simulator();
    const pinBus: ComponentInstance = { id: 'pinBus', type: 'PIN_INPUT', x: 0, y: 0, bitWidth: 2, state: { value: ['1', '0'] } };
    const splitter: ComponentInstance = { id: 's1', type: 'SPLITTER', x: 60, y: 0, state: {} };
    const probe0: ComponentInstance = { id: 'pr0', type: 'PROBE', x: 120, y: 0, state: {} };
    const probe1: ComponentInstance = { id: 'pr1', type: 'PROBE', x: 120, y: 40, state: {} };

    const wires: Wire[] = [
      { id: 'wB', from: { componentId: 'pinBus', portId: 'out' }, to: { componentId: 's1', portId: 'combined' }, points: [] },
      { id: 'w0', from: { componentId: 's1', portId: 'bit0' }, to: { componentId: 'pr0', portId: 'in' }, points: [] },
      { id: 'w1', from: { componentId: 's1', portId: 'bit1' }, to: { componentId: 'pr1', portId: 'in' }, points: [] },
    ];

    sim.setCircuit([pinBus, splitter, probe0, probe1], wires);
    sim.step();
    expect(sim.getPinValue('pr0', 'in')).toEqual(['1']);
    expect(sim.getPinValue('pr1', 'in')).toEqual(['0']);
  });

  it('splits and rejoins a configurable four-bit bus without changing bit order', () => {
    const sim = new Simulator();
    const busInput: ComponentInstance = {
      id: 'bus-input',
      type: 'PIN_INPUT',
      x: 0,
      y: 0,
      bitWidth: 4,
      state: { value: ['1', '0', '1', '1'] },
    };
    const splitter: ComponentInstance = {
      id: 'splitter',
      type: 'SPLITTER',
      x: 80,
      y: 0,
      bitWidth: 4,
    };
    const probes = Array.from({ length: 4 }, (_, index): ComponentInstance => ({
      id: `probe-${index}`,
      type: 'PROBE',
      x: 140,
      y: index * 30,
    }));
    const wires: Wire[] = [
      {
        id: 'bus-splitter',
        from: { componentId: busInput.id, portId: 'out' },
        to: { componentId: splitter.id, portId: 'combined' },
        points: [],
      },
      ...probes.map((probe, index): Wire => ({
        id: `splitter-${index}`,
        from: { componentId: splitter.id, portId: `bit${index}` },
        to: { componentId: probe.id, portId: 'in' },
        points: [],
      })),
    ];

    sim.setCircuit([busInput, splitter, ...probes], wires);
    sim.step();
    expect(probes.map(probe => sim.getPinValue(probe.id, 'in'))).toEqual([
      ['1'],
      ['0'],
      ['1'],
      ['1'],
    ]);

    const joined: ComponentInstance = {
      id: 'joined',
      type: 'PIN_OUTPUT',
      x: 200,
      y: 0,
      bitWidth: 4,
    };
    sim.setCircuit(
      [busInput, splitter, ...probes, joined],
      [
        ...wires,
        {
          id: 'rejoined-bus',
          from: { componentId: splitter.id, portId: 'combined' },
          to: { componentId: joined.id, portId: 'in' },
          points: [],
        },
      ]
    );
    sim.step();
    expect(sim.getPinValue(joined.id, 'in')).toEqual(['1', '0', '1', '1']);

    const singleBitInput: ComponentInstance = {
      id: 'single-bit-input',
      type: 'PIN_INPUT',
      x: 0,
      y: 120,
      state: { value: ['0'] },
    };
    const partialBusOutput: ComponentInstance = {
      id: 'partial-bus-output',
      type: 'PIN_OUTPUT',
      x: 200,
      y: 120,
      bitWidth: 4,
    };
    sim.setCircuit(
      [singleBitInput, splitter, partialBusOutput],
      [
        {
          id: 'input-to-bit1',
          from: { componentId: singleBitInput.id, portId: 'out' },
          to: { componentId: splitter.id, portId: 'bit1' },
          points: [],
        },
        {
          id: 'splitter-to-partial-output',
          from: { componentId: splitter.id, portId: 'combined' },
          to: { componentId: partialBusOutput.id, portId: 'in' },
          points: [],
        },
      ]
    );
    sim.step();
    expect(sim.getPinValue(partialBusOutput.id, 'in')).toEqual(['Z', '0', 'Z', 'Z']);
  });
});
