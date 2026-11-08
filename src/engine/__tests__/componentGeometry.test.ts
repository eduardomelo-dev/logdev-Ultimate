import { describe, expect, it } from 'vitest';
import { getComponentDimensions, getOrientedPort, getPortWorldPosition, rotateDirection } from '../componentGeometry';
import { COMPONENT_METADATA } from '../components';
import { ComponentInstance, ComponentType, Direction } from '../../types/circuit';
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

  it('resizes configurable multiplexers and repositions their input ports', () => {
    const mux: ComponentInstance = {
      id: 'mux',
      type: 'MULTIPLEXER',
      x: 10,
      y: 20,
      inputs: 4,
    };

    expect(getComponentDimensions(mux)).toEqual({ width: 50, height: 100 });
    expect(getPortWorldPosition(mux, 'in3')).toEqual({ x: 10, y: 100 });
    expect(getPortWorldPosition(mux, 'sel')).toEqual({ x: 35, y: 120 });
  });

  it('resizes a bus splitter and exposes one port per bit', () => {
    const splitter: ComponentInstance = {
      id: 'splitter',
      type: 'SPLITTER',
      x: 10,
      y: 20,
      bitWidth: 4,
    };

    expect(getComponentDimensions(splitter)).toEqual({ width: 20, height: 80 });
    expect(getPortWorldPosition(splitter, 'combined')).toEqual({ x: 10, y: 60 });
    expect(getPortWorldPosition(splitter, 'bit3')).toEqual({ x: 30, y: 90 });
  });

  it('keeps every default component port inside its rotated bounds', () => {
    const directions: Direction[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
    for (const type of Object.keys(COMPONENT_METADATA) as ComponentType[]) {
      const component: ComponentInstance = {
        id: `geometry-${type}`,
        type,
        x: 0,
        y: 0,
        inputs: 4,
        bitWidth: 4,
        direction: 'EAST',
      };
      for (const direction of directions) {
        const oriented = { ...component, direction };
        const dimensions = getComponentDimensions(oriented);
        const ports = COMPONENT_METADATA[type]
          .getPorts(oriented.inputs, oriented.bitWidth, oriented);
        for (const port of ports) {
          const position = getPortWorldPosition(oriented, port.id);
          expect(position?.x, `${type}.${port.id} x (${direction})`).toBeGreaterThanOrEqual(0);
          expect(position?.y, `${type}.${port.id} y (${direction})`).toBeGreaterThanOrEqual(0);
          expect(position?.x, `${type}.${port.id} x (${direction})`).toBeLessThanOrEqual(dimensions.width);
          expect(position?.y, `${type}.${port.id} y (${direction})`).toBeLessThanOrEqual(dimensions.height);
        }
      }
    }
  });
});
