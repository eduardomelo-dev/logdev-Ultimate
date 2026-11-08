import { describe, expect, it } from 'vitest';
import { extractSubcircuit } from '../subcircuits';
import { Simulator } from '../simulator';
import { CircuitState } from '../../types/circuit';
import { parseCircuitData, serializeCircuitData } from '../../utils/circuitPersistence';

function createAndCircuit(): CircuitState {
  return {
    components: [
      { id: 'a', type: 'PIN_INPUT', x: 0, y: 0, label: 'A', state: { value: ['1'] } },
      { id: 'b', type: 'PIN_INPUT', x: 0, y: 80, label: 'B', state: { value: ['1'] } },
      { id: 'gate', type: 'AND', x: 120, y: 20, inputs: 2 },
      { id: 'y', type: 'PIN_OUTPUT', x: 240, y: 20, label: 'Y' },
    ],
    wires: [
      { id: 'a-gate', from: { componentId: 'a', portId: 'out' }, to: { componentId: 'gate', portId: 'in0' }, points: [{ x: 40, y: 20 }, { x: 120, y: 37 }] },
      { id: 'b-gate', from: { componentId: 'b', portId: 'out' }, to: { componentId: 'gate', portId: 'in1' }, points: [{ x: 40, y: 100 }, { x: 120, y: 53 }] },
      { id: 'gate-y', from: { componentId: 'gate', portId: 'out' }, to: { componentId: 'y', portId: 'in' }, points: [{ x: 180, y: 45 }, { x: 240, y: 40 }] },
    ],
  };
}

describe('Hierarchical subcircuits', () => {
  it('extracts selected logic and auto-creates external input/output ports', () => {
    const extracted = extractSubcircuit(createAndCircuit(), ['gate'], 'AND module');
    const subcircuit = extracted.circuit.components.find(component => component.id === extracted.subcircuitId);

    expect(extracted.circuit.components.map(component => component.id)).toEqual([
      'a',
      'b',
      extracted.subcircuitId,
      'y',
    ]);
    expect(subcircuit?.subcircuit?.ports.map(port => port.direction)).toEqual(['in', 'in', 'out']);
    expect(subcircuit?.subcircuit?.circuit.components).toHaveLength(4);
    expect(subcircuit?.subcircuit?.circuit.wires).toHaveLength(3);
    expect(extracted.circuit.wires).toHaveLength(3);
    expect(extracted.circuit.wires.every(wire =>
      wire.from.componentId === extracted.subcircuitId ||
      wire.to.componentId === extracted.subcircuitId
    )).toBe(true);
  });

  it('simulates the extracted block and preserves nested definitions in project JSON', () => {
    const extracted = extractSubcircuit(createAndCircuit(), ['gate']);
    const simulator = new Simulator();
    simulator.setCircuit(extracted.circuit.components, extracted.circuit.wires);
    simulator.step();
    simulator.step();

    expect(simulator.getPinValue('y', 'in')).toEqual(['1']);
    expect(parseCircuitData(JSON.parse(serializeCircuitData(extracted.circuit))))
      .toEqual(extracted.circuit);
  });

  it('rejects selections with unsupported bidirectional external ports', () => {
    const circuit: CircuitState = {
      components: [
        { id: 'splitter', type: 'SPLITTER', x: 80, y: 0 },
        { id: 'pin', type: 'PIN_INPUT', x: 0, y: 0 },
      ],
      wires: [{
        id: 'wire',
        from: { componentId: 'pin', portId: 'out' },
        to: { componentId: 'splitter', portId: 'bit0' },
        points: [{ x: 40, y: 20 }, { x: 80, y: 10 }],
      }],
    };

    expect(() => extractSubcircuit(circuit, ['splitter']))
      .toThrow(/portas bidirecionais/i);
  });
});
