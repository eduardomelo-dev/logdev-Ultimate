import { describe, expect, it } from 'vitest';
import { parseCircuitData, serializeCircuitData } from '../circuitPersistence';
import { CircuitState } from '../../types/circuit';

describe('Circuit autosave data', () => {
  const circuit: CircuitState = {
    components: [
      { id: 'input', type: 'PIN_INPUT', x: 0, y: 0 },
      { id: 'output', type: 'PIN_OUTPUT', x: 100, y: 0 },
    ],
    wires: [{
      id: 'wire1',
      from: { componentId: 'input', portId: 'out' },
      to: { componentId: 'output', portId: 'in' },
      points: [{ x: 40, y: 20 }, { x: 100, y: 20 }],
    }],
  };

  it('round-trips saved circuits and accepts existing exported JSON shape', () => {
    expect(parseCircuitData(JSON.parse(serializeCircuitData(circuit)))).toEqual(circuit);
    expect(parseCircuitData(circuit)).toEqual(circuit);
  });

  it('rejects invalid endpoints and duplicate component IDs', () => {
    expect(() => parseCircuitData({
      components: [{ id: 'input', type: 'PIN_INPUT', x: 0, y: 0 }],
      wires: [{
        id: 'wire1',
        from: { componentId: 'missing', portId: 'out' },
        to: { componentId: 'input', portId: 'out' },
        points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      }],
    })).toThrow(/conexões/);
    expect(() => parseCircuitData({
      components: [
        { id: 'same', type: 'PIN_INPUT', x: 0, y: 0 },
        { id: 'same', type: 'PIN_OUTPUT', x: 20, y: 0 },
      ],
      wires: [],
    })).toThrow(/duplicados/);
  });
});
