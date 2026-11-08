import { ComponentInstance, Direction, Point, Port } from '../types/circuit';
import { COMPONENT_METADATA } from './components';

export interface ComponentDimensions {
  width: number;
  height: number;
}

export function getBaseComponentDimensions(component: ComponentInstance): ComponentDimensions {
  const metadata = COMPONENT_METADATA[component.type];
  if (!metadata) return { width: 0, height: 0 };
  if (component.type !== 'SUBCIRCUIT') {
    if (component.type === 'MULTIPLEXER' || component.type === 'DEMULTIPLEXER') {
      const count = Math.max(2, Math.min(8, Math.floor(component.inputs ?? 2)));
      return { width: metadata.width, height: Math.max(metadata.height, (count + 1) * 20) };
    }
    if (component.type === 'SPLITTER') {
      const count = Math.max(2, Math.min(32, Math.floor(component.bitWidth ?? 2)));
      return { width: metadata.width, height: Math.max(metadata.height, (count - 1) * 20 + 20) };
    }
    if (component.type === 'DECODER') {
      const count = 2 ** Math.max(1, Math.min(5, Math.floor(component.bitWidth ?? 2)));
      return { width: metadata.width, height: Math.max(metadata.height, (count + 1) * 12) };
    }
    if (component.type === 'PRIORITY_ENCODER') {
      const count = Math.max(2, Math.min(32, Math.floor(component.bitWidth ?? 4)));
      return { width: metadata.width, height: Math.max(metadata.height, (count + 1) * 12) };
    }
    return { width: metadata.width, height: metadata.height };
  }
  const ports = component.subcircuit?.ports ?? [];
  const sideCount = Math.max(
    ports.filter(port => port.direction === 'in').length,
    ports.filter(port => port.direction === 'out').length
  );
  return { width: metadata.width, height: Math.max(metadata.height, (sideCount + 1) * 20) };
}

export function getComponentDimensions(component: ComponentInstance): ComponentDimensions {
  const base = getBaseComponentDimensions(component);
  const rotated = component.direction === 'NORTH' || component.direction === 'SOUTH';
  return rotated
    ? { width: base.height, height: base.width }
    : base;
}

export function getRotationAngle(direction: Direction = 'EAST'): number {
  switch (direction) {
    case 'SOUTH': return Math.PI / 2;
    case 'WEST': return Math.PI;
    case 'NORTH': return -Math.PI / 2;
    default: return 0;
  }
}

export function getOrientedPort(component: ComponentInstance, portId: string): Port | undefined {
  const metadata = COMPONENT_METADATA[component.type];
  const port = metadata?.getPorts(component.inputs, component.bitWidth, component).find(item => item.id === portId);
  if (!metadata || !port) return undefined;
  const base = getBaseComponentDimensions(component);

  switch (component.direction ?? 'EAST') {
    case 'SOUTH':
      return { ...port, relX: base.height - port.relY, relY: port.relX };
    case 'WEST':
      return { ...port, relX: base.width - port.relX, relY: base.height - port.relY };
    case 'NORTH':
      return { ...port, relX: port.relY, relY: base.width - port.relX };
    default:
      return port;
  }
}

export function getPortWorldPosition(component: ComponentInstance, portId: string): Point | undefined {
  const port = getOrientedPort(component, portId);
  if (!port) return undefined;
  return { x: component.x + port.relX, y: component.y + port.relY };
}

export function rotateDirection(direction: Direction | undefined, steps = 1): Direction {
  const directions: Direction[] = ['EAST', 'SOUTH', 'WEST', 'NORTH'];
  const currentIndex = directions.indexOf(direction ?? 'EAST');
  return directions[(currentIndex + steps % directions.length + directions.length) % directions.length];
}
