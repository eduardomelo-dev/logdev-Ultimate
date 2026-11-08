import { Point, Wire } from '../types/circuit';

/**
 * Generates an orthogonal (Manhattan) route between start and end.
 * Preference: Horizontal first to midpoint X, then vertical, then horizontal to end X.
 */
export function routeOrthogonalWire(start: Point, end: Point): Point[] {
  if (start.x === end.x || start.y === end.y) {
    return [{ ...start }, { ...end }];
  }

  const midX = Math.round((start.x + end.x) / 2);
  return [
    { ...start },
    { x: midX, y: start.y },
    { x: midX, y: end.y },
    { ...end },
  ];
}

/**
 * Calculates distance from point P to line segment AB.
 */
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * (b.x - a.x);
  const projY = a.y + t * (b.y - a.y);
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Hit test for wire segments.
 */
export function hitTestWire(wire: Wire, worldPoint: Point, tolerance = 6): boolean {
  if (!wire.points || wire.points.length < 2) return false;
  for (let i = 0; i < wire.points.length - 1; i++) {
    const d = distanceToSegment(worldPoint, wire.points[i], wire.points[i + 1]);
    if (d <= tolerance) return true;
  }
  return false;
}

export function getClosestPointOnWire(wire: Wire, point: Point): Point | undefined {
  if (!wire.points || wire.points.length < 2) return undefined;
  let closestPoint: Point | undefined;
  let closestDistance = Infinity;

  for (let index = 0; index < wire.points.length - 1; index++) {
    const start = wire.points[index];
    const end = wire.points[index + 1];
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const lengthSquared = deltaX * deltaX + deltaY * deltaY;
    const fraction = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, (
          (point.x - start.x) * deltaX + (point.y - start.y) * deltaY
        ) / lengthSquared));
    const candidate = {
      x: start.x + fraction * deltaX,
      y: start.y + fraction * deltaY,
    };
    const distance = Math.hypot(point.x - candidate.x, point.y - candidate.y);
    if (distance < closestDistance) {
      closestPoint = candidate;
      closestDistance = distance;
    }
  }

  return closestPoint;
}
