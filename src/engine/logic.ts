import { BitVector, GateType, LogicValue } from '../types/circuit';

/**
 * Resolves the state of a single 1-bit wire driven by zero or more drivers.
 * Rules:
 * - Empty / all Z -> 'Z' (Floating)
 * - Single defined driver (with rest Z) -> driver value
 * - Multiple same drivers (e.g. 1 and 1) -> driver value
 * - Conflicting drivers (0 and 1, or any X) -> 'X' (Contention / Error)
 */
export function resolveWire(drivers: LogicValue[]): LogicValue {
  const active = drivers.filter(v => v !== 'Z');
  if (active.length === 0) return 'Z';
  if (active.includes('X')) return 'X';

  const first = active[0];
  for (let i = 1; i < active.length; i++) {
    if (active[i] !== first) {
      return 'X';
    }
  }
  return first;
}

/**
 * Resolves a multi-bit bus given an array of driving bit vectors.
 */
export function resolveBus(drivers: BitVector[]): BitVector {
  if (drivers.length === 0) return ['Z'];
  const width = Math.max(...drivers.map(d => d.length));
  const result: BitVector = [];

  for (let bit = 0; bit < width; bit++) {
    const bitDrivers: LogicValue[] = [];
    for (const d of drivers) {
      if (bit < d.length) {
        bitDrivers.push(d[bit]);
      } else {
        bitDrivers.push('Z');
      }
    }
    result.push(resolveWire(bitDrivers));
  }

  return result;
}

/**
 * Evaluates standard logic gates across input bit vectors.
 */
export function evaluateGate(type: GateType, inputs: BitVector[]): BitVector {
  if (inputs.length === 0) return ['Z'];

  const width = Math.max(...inputs.map(i => i.length));
  const result: BitVector = [];

  for (let bit = 0; bit < width; bit++) {
    const bitInputs = inputs.map(inp => inp[bit] || '0');

    switch (type) {
      case 'AND': {
        if (bitInputs.includes('0')) result.push('0');
        else if (bitInputs.includes('X') || bitInputs.includes('Z')) result.push('X');
        else result.push('1');
        break;
      }
      case 'NAND': {
        if (bitInputs.includes('0')) result.push('1');
        else if (bitInputs.includes('X') || bitInputs.includes('Z')) result.push('X');
        else result.push('0');
        break;
      }
      case 'OR': {
        if (bitInputs.includes('1')) result.push('1');
        else if (bitInputs.includes('X') || bitInputs.includes('Z')) result.push('X');
        else result.push('0');
        break;
      }
      case 'NOR': {
        if (bitInputs.includes('1')) result.push('0');
        else if (bitInputs.includes('X') || bitInputs.includes('Z')) result.push('X');
        else result.push('1');
        break;
      }
      case 'NOT': {
        const val = bitInputs[0];
        if (val === '0') result.push('1');
        else if (val === '1') result.push('0');
        else result.push('X');
        break;
      }
      case 'XOR': {
        if (bitInputs.includes('Z') || bitInputs.includes('X')) {
          result.push('X');
        } else {
          const ones = bitInputs.filter(v => v === '1').length;
          result.push(ones % 2 === 1 ? '1' : '0');
        }
        break;
      }
      case 'XNOR': {
        if (bitInputs.includes('Z') || bitInputs.includes('X')) {
          result.push('X');
        } else {
          const ones = bitInputs.filter(v => v === '1').length;
          result.push(ones % 2 === 0 ? '1' : '0');
        }
        break;
      }
      case 'BUFFER': {
        result.push(bitInputs[0]);
        break;
      }
      case 'TRISTATE': {
        // inputs[0] = data, inputs[1] = enable (active high)
        const data = bitInputs[0] || 'Z';
        const enable = inputs[1] ? inputs[1][0] : '0';
        if (enable === '1') result.push(data);
        else if (enable === '0') result.push('Z');
        else result.push('X');
        break;
      }
      default:
        result.push('X');
    }
  }

  return result;
}
