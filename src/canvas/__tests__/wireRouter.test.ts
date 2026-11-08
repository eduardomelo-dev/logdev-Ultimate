import { describe, it, expect } from 'vitest';
import { getClosestPointOnWire, routeOrthogonalWire, hitTestWire } from '../wireRouter';

describe('Wire Router', () => {
  it('creates clean orthogonal path between two offset points', () => {
    const path = routeOrthogonalWire({ x: 20, y: 20 }, { x: 100, y: 80 });
    expect(path.length).toBeGreaterThanOrEqual(3);
    expect(path[0]).toEqual({ x: 20, y: 20 });
    expect(path[path.length - 1]).toEqual({ x: 100, y: 80 });
    // Check that segments are strictly horizontal or vertical
    for (let i = 0; i < path.length - 1; i++) {
      const isOrthogonal = path[i].x === path[i+1].x || path[i].y === path[i+1].y;
      expect(isOrthogonal).toBe(true);
    }
  });

  it('handles collinear horizontal points', () => {
    const path = routeOrthogonalWire({ x: 20, y: 40 }, { x: 100, y: 40 });
    expect(path.length).toBe(2);
    expect(path[0]).toEqual({ x: 20, y: 40 });
    expect(path[1]).toEqual({ x: 100, y: 40 });
  });

  it('handles collinear vertical points', () => {
    const path = routeOrthogonalWire({ x: 50, y: 10 }, { x: 50, y: 90 });
    expect(path.length).toBe(2);
    expect(path[0]).toEqual({ x: 50, y: 10 });
    expect(path[1]).toEqual({ x: 50, y: 90 });
  });

  it('detects point near wire segment', () => {
    const wire = {
      id: 'w1',
      from: { componentId: 'a', portId: 'out' },
      to: { componentId: 'b', portId: 'in' },
      points: [{ x: 10, y: 10 }, { x: 100, y: 10 }]
    };
    expect(hitTestWire(wire, { x: 50, y: 12 }, 5)).toBe(true);
    expect(hitTestWire(wire, { x: 50, y: 30 }, 5)).toBe(false);
  });

  it('projects junction placement onto the nearest wire segment', () => {
    const wire = {
      id: 'wire',
      from: { componentId: 'a', portId: 'out' },
      to: { componentId: 'b', portId: 'in' },
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }],
    };

    expect(getClosestPointOnWire(wire, { x: 42, y: 3 })).toEqual({ x: 42, y: 0 });
    expect(getClosestPointOnWire(wire, { x: 108, y: 18 })).toEqual({ x: 100, y: 18 });
  });
});
