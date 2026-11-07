import '@testing-library/jest-dom';

// Mock Canvas 2D context for JSDOM
HTMLCanvasElement.prototype.getContext = () => ({
  clearRect: () => {},
  fillRect: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  arc: () => {},
  stroke: () => {},
  fill: () => {},
  save: () => {},
  restore: () => {},
  translate: () => {},
  scale: () => {},
  setLineDash: () => {},
  roundRect: () => {},
  quadraticCurveTo: () => {},
  fillText: () => {},
  measureText: () => ({ width: 0 }),
  closePath: () => {},
  strokeRect: () => {},
} as any);
