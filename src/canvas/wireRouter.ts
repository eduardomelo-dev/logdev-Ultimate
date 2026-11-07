import { Point } from '../types/circuit';

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
