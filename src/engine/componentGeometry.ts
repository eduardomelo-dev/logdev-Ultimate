import { ComponentInstance, Direction, Point, Port } from '../types/circuit';
import { COMPONENT_METADATA } from './components';

export interface ComponentDimensions {
  width: number;
  height: number;
}

export function getComponentDimensions(component: ComponentInstance): ComponentDimensions {
  const metadata = COMPONENT_METADATA[component.type];
  if (!metadata) return { width: 0, height: 0 };
  const rotated = component.direction === 'NORTH' || component.direction === 'SOUTH';
  return rotated
    ? { width: metadata.height, height: metadata.width }
    : { width: metadata.width, height: metadata.height };
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
  const port = metadata?.getPorts(component.inputs, component.bitWidth).find(item => item.id === portId);
  if (!metadata || !port) return undefined;

  switch (component.direction ?? 'EAST') {
    case 'SOUTH':
      return { ...port, relX: metadata.height - port.relY, relY: port.relX };
    case 'WEST':
      return { ...port, relX: metadata.width - port.relX, relY: metadata.height - port.relY };
    case 'NORTH':
      return { ...port, relX: port.relY, relY: metadata.width - port.relX };
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
