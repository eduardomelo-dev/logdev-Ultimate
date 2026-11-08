import { describe, expect, it } from 'vitest';
import { ComponentInstance, Wire } from '../../types/circuit';
import { getMarqueeSelectedIds } from '../selection';

describe('Marquee selection', () => {
  const components: ComponentInstance[] = [
    { id: 'inside', type: 'AND', x: 40, y: 40 },
    { id: 'touching', type: 'AND', x: 95, y: 40 },
  ];
  const wires: Wire[] = [
    {
      id: 'wire-inside',
      from: { componentId: 'inside', portId: 'out' },
      to: { componentId: 'touching', portId: 'in0' },
      points: [{ x: 20, y: 20 }, { x: 40, y: 20 }],
    },
  ];

  it('selects only fully enclosed components and wires with a left-to-right window', () => {
    expect(getMarqueeSelectedIds(
      components,
      wires,
      { x: 0, y: 0 },
      { x: 110, y: 100 }
    )).toEqual(['inside', 'wire-inside']);
  });

  it('selects intersecting components and wires with a right-to-left crossing window', () => {
    expect(getMarqueeSelectedIds(
      components,
      wires,
      { x: 120, y: 100 },
      { x: 101, y: 0 }
    )).toEqual(['touching']);
  });
});
