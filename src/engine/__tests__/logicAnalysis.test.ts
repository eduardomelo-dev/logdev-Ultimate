import { describe, expect, it } from 'vitest';
import { analyzeCombinationalCircuit } from '../logicAnalysis';
import { ComponentInstance, Wire } from '../../types/circuit';

function pin(id: string, type: 'PIN_INPUT' | 'PIN_OUTPUT', x = 0): ComponentInstance {
  return { id, type, x, y: 0, label: id, state: { value: ['0'] } };
}

function wire(id: string, from: string, fromPort: string, to: string, toPort: string): Wire {
  return {
    id,
    from: { componentId: from, portId: fromPort },
    to: { componentId: to, portId: toPort },
    points: [],
  };
}

describe('Combinational logic analysis', () => {
  it('generates the truth table, minimized expression, and Karnaugh map for AND', () => {
    const result = analyzeCombinationalCircuit({
      components: [
        pin('A', 'PIN_INPUT'),
        pin('B', 'PIN_INPUT', 40),
        { id: 'and', type: 'AND', x: 80, y: 0, inputs: 2 },
        pin('Y', 'PIN_OUTPUT', 160),
      ],
      wires: [
        wire('a-and', 'A', 'out', 'and', 'in0'),
        wire('b-and', 'B', 'out', 'and', 'in1'),
        wire('and-y', 'and', 'out', 'Y', 'in'),
      ],
    });

    expect(result.rows.map(row => row.outputs)).toEqual([['0'], ['0'], ['0'], ['1']]);
    expect(result.outputs[0].expression).toBe('A · B');
    expect(result.outputs[0].karnaughMap?.values).toEqual([
      ['0', '0'],
      ['0', '1'],
    ]);
  });

  it('minimizes XOR and uses Gray-code labels in the Karnaugh map', () => {
    const result = analyzeCombinationalCircuit({
      components: [
        pin('left', 'PIN_INPUT'),
        pin('right', 'PIN_INPUT', 40),
        { id: 'xor', type: 'XOR', x: 80, y: 0, inputs: 2 },
        pin('out', 'PIN_OUTPUT', 160),
      ],
      wires: [
        wire('left-xor', 'left', 'out', 'xor', 'in0'),
        wire('right-xor', 'right', 'out', 'xor', 'in1'),
        wire('xor-out', 'xor', 'out', 'out', 'in'),
      ],
    });

    expect(result.outputs[0].expression).toBe('¬A · B + A · ¬B');
    expect(result.outputs[0].karnaughMap?.rowLabels).toEqual(['0', '1']);
    expect(result.outputs[0].karnaughMap?.columnLabels).toEqual(['0', '1']);
    expect(result.outputs[0].karnaughMap?.values).toEqual([
      ['0', '1'],
      ['1', '0'],
    ]);
  });

  it('does not alter the live circuit input values while enumerating combinations', () => {
    const circuit = {
      components: [
        { ...pin('A', 'PIN_INPUT'), state: { value: ['1'] } },
        { ...pin('B', 'PIN_INPUT', 40), state: { value: ['0'] } },
        { id: 'and', type: 'AND' as const, x: 80, y: 0, inputs: 2 },
        pin('Y', 'PIN_OUTPUT', 160),
      ],
      wires: [
        wire('a-and', 'A', 'out', 'and', 'in0'),
        wire('b-and', 'B', 'out', 'and', 'in1'),
        wire('and-y', 'and', 'out', 'Y', 'in'),
      ],
    };

    analyzeCombinationalCircuit(circuit);

    expect(circuit.components[0].state?.value).toEqual(['1']);
    expect(circuit.components[1].state?.value).toEqual(['0']);
  });

  it('rejects sequential components with an actionable message', () => {
    expect(() => analyzeCombinationalCircuit({
      components: [
        pin('A', 'PIN_INPUT'),
        { id: 'ff', type: 'D_FLIP_FLOP', x: 80, y: 0 },
        pin('Y', 'PIN_OUTPUT', 160),
      ],
      wires: [],
    })).toThrow(/apenas circuitos combinacionais/i);
  });

  it('rejects circuits with more than eight connected inputs', () => {
    const inputs = Array.from({ length: 9 }, (_, index) => pin(`i${index}`, 'PIN_INPUT', index * 40));
    const gate: ComponentInstance = { id: 'gate', type: 'AND', x: 400, y: 0, inputs: 2 };
    const output = pin('out', 'PIN_OUTPUT', 480);
    const circuitComponents = [...inputs, gate, output];
    const circuitWires = [
      wire('i0', 'i0', 'out', 'gate', 'in0'),
      wire('i1', 'i1', 'out', 'gate', 'in1'),
      wire('out', 'gate', 'out', 'out', 'in'),
      ...inputs.slice(2).map((input, index) => wire(`extra-${index}`, input.id, 'out', output.id, 'in')),
    ];

    expect(() => analyzeCombinationalCircuit({
      components: circuitComponents,
      wires: circuitWires,
    })).toThrow(/até 8 entradas/i);
  });
});
