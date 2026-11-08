import { getComponentDimensions } from '../engine/componentGeometry';
import { ComponentInstance, Point, Wire } from '../types/circuit';

export interface SelectionBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type MarqueeMode = 'window' | 'crossing';

export function getSelectionBounds(start: Point, end: Point): SelectionBounds {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    right: Math.max(start.x, end.x),
    bottom: Math.max(start.y, end.y),
  };
}

function isPointInside(point: Point, bounds: SelectionBounds): boolean {
  return point.x >= bounds.left && point.x <= bounds.right
    && point.y >= bounds.top && point.y <= bounds.bottom;
}

function intersects(boundsA: SelectionBounds, boundsB: SelectionBounds): boolean {
  return boundsA.left <= boundsB.right && boundsA.right >= boundsB.left
    && boundsA.top <= boundsB.bottom && boundsA.bottom >= boundsB.top;
}

function wireIntersectsBounds(wire: Wire, bounds: SelectionBounds): boolean {
  return wire.points.some(point => isPointInside(point, bounds))
    || wire.points.slice(1).some((point, index) => {
      const previous = wire.points[index];
      const segmentBounds = {
        left: Math.min(previous.x, point.x),
        top: Math.min(previous.y, point.y),
        right: Math.max(previous.x, point.x),
        bottom: Math.max(previous.y, point.y),
      };
      return intersects(segmentBounds, bounds);
    });
}

export function getMarqueeSelectedIds(
  components: ComponentInstance[],
  wires: Wire[],
  start: Point,
  end: Point
): string[] {
  const bounds = getSelectionBounds(start, end);
  const mode: MarqueeMode = end.x >= start.x ? 'window' : 'crossing';
  const selectedIds = components.flatMap(component => {
    const dimensions = getComponentDimensions(component);
    const componentBounds = {
      left: component.x,
      top: component.y,
      right: component.x + dimensions.width,
      bottom: component.y + dimensions.height,
    };
    const selected = mode === 'window'
      ? isPointInside({ x: componentBounds.left, y: componentBounds.top }, bounds)
        && isPointInside({ x: componentBounds.right, y: componentBounds.bottom }, bounds)
      : intersects(componentBounds, bounds);
    return selected ? [component.id] : [];
  });

  for (const wire of wires) {
    const selected = mode === 'window'
      ? wire.points.every(point => isPointInside(point, bounds))
      : wireIntersectsBounds(wire, bounds);
    if (selected) selectedIds.push(wire.id);
  }

  return selectedIds;
}
