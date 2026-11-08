import { describe, expect, it } from 'vitest';
import { getComponentDimensions, getOrientedPort, getPortWorldPosition, rotateDirection } from '../componentGeometry';
import { ComponentInstance } from '../../types/circuit';
import { hitTestComponent, hitTestPort } from '../../canvas/renderer';

describe('Component geometry', () => {
  const gate: ComponentInstance = { id: 'and1', type: 'AND', x: 100, y: 200, direction: 'EAST' };

  it('rotates component bounds and all ports while preserving port identities', () => {
    expect(getComponentDimensions({ ...gate, direction: 'SOUTH' })).toEqual({ width: 50, height: 60 });
    expect(getOrientedPort(gate, 'in0')).toMatchObject({ id: 'in0', relX: 0, relY: 17 });
    expect(getOrientedPort({ ...gate, direction: 'SOUTH' }, 'in0'))
      .toMatchObject({ id: 'in0', relX: 33, relY: 0 });
    expect(getOrientedPort({ ...gate, direction: 'WEST' }, 'out'))
      .toMatchObject({ id: 'out', relX: 0, relY: 25 });
    expect(getOrientedPort({ ...gate, direction: 'NORTH' }, 'out'))
      .toMatchObject({ id: 'out', relX: 25, relY: 0 });
  });

  it('returns world-space port positions and rotates orientation cyclically', () => {
    expect(getPortWorldPosition({ ...gate, direction: 'SOUTH' }, 'out')).toEqual({ x: 125, y: 260 });
    expect(rotateDirection('EAST')).toBe('SOUTH');
    expect(rotateDirection('EAST', -1)).toBe('NORTH');
    expect(rotateDirection('WEST', 2)).toBe('EAST');
  });

  it('hit-tests rotated bounds and port coordinates', () => {
    const rotated = { ...gate, direction: 'SOUTH' as const };
    expect(hitTestComponent(rotated, { x: 149, y: 259 })).toBe(true);
    expect(hitTestComponent(rotated, { x: 160, y: 230 })).toBe(false);
    expect(hitTestPort(rotated, { x: 133, y: 200 }, 1)?.id).toBe('in0');
  });
});
