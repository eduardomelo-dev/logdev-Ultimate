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
  rotate: () => {},
  setLineDash: () => {},
  roundRect: () => {},
  quadraticCurveTo: () => {},
  fillText: () => {},
  measureText: () => ({ width: 0 }),
  closePath: () => {},
  strokeRect: () => {},
} as any);

HTMLCanvasElement.prototype.toDataURL = () =>
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
