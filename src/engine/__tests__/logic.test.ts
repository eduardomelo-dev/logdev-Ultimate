import { describe, it, expect } from 'vitest';
import { resolveWire, resolveBus, evaluateGate } from '../logic';

describe('Logic resolution & gates', () => {
  it('resolves floating and single drivers', () => {
    expect(resolveWire(['Z'])).toBe('Z');
    expect(resolveWire(['1'])).toBe('1');
    expect(resolveWire(['0', 'Z'])).toBe('0');
  });

  it('detects contention between 0 and 1', () => {
    expect(resolveWire(['0', '1'])).toBe('X');
    expect(resolveWire(['1', '1'])).toBe('1');
  });

  it('computes standard gates correctly', () => {
    expect(evaluateGate('AND', [['1'], ['1']])).toEqual(['1']);
    expect(evaluateGate('AND', [['1'], ['0']])).toEqual(['0']);
    expect(evaluateGate('OR', [['0'], ['1']])).toEqual(['1']);
    expect(evaluateGate('NOT', [['1']])).toEqual(['0']);
    expect(evaluateGate('XOR', [['1'], ['1']])).toEqual(['0']);
    expect(evaluateGate('XOR', [['1'], ['0']])).toEqual(['1']);
    expect(evaluateGate('NAND', [['1'], ['1']])).toEqual(['0']);
    expect(evaluateGate('NOR', [['0'], ['0']])).toEqual(['1']);
    expect(evaluateGate('XNOR', [['1'], ['1']])).toEqual(['1']);
  });

  it('resolves multi-bit bus correctly', () => {
    expect(resolveBus([['1', '0'], ['1', 'Z']])).toEqual(['1', '0']);
    expect(resolveBus([['1', '0'], ['1', '1']])).toEqual(['1', 'X']);
  });
});
