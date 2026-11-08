import { describe, it, expect, vi } from 'vitest';
import { renderCircuitToOffscreenCanvas, exportToJpeg, exportToPdf } from '../exportUtils';
import { ComponentInstance, Wire } from '../../types/circuit';

describe('Export Utils (PDF & JPEG)', () => {
  const dummyComponents: ComponentInstance[] = [
    { id: 'pin1', type: 'PIN_INPUT', x: 100, y: 100, state: { value: ['1'] } },
    { id: 'gate1', type: 'AND', x: 200, y: 100 },
  ];
  const dummyWires: Wire[] = [
    {
      id: 'w1',
      from: { componentId: 'pin1', portId: 'out' },
      to: { componentId: 'gate1', portId: 'in0' },
      points: [{ x: 140, y: 120 }, { x: 200, y: 117 }],
    },
  ];

  it('renders offscreen canvas with calculated bounding box and padding', () => {
    const canvas = renderCircuitToOffscreenCanvas(
      dummyComponents,
      dummyWires,
      () => ['1'],
      () => ['1']
    );
    expect(canvas).toBeDefined();
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
  });

  it('triggers JPEG download without errors', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    expect(() => {
      exportToJpeg(dummyComponents, dummyWires, () => ['1'], () => ['1'], 'test.jpg');
    }).not.toThrow();

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('generates PDF file without crashing', () => {
    expect(() => {
      exportToPdf(dummyComponents, dummyWires, () => ['1'], () => ['1'], 'test.pdf');
    }).not.toThrow();
  });
});
