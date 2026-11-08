import { describe, it, expect, vi } from 'vitest';
import { renderCircuitToOffscreenCanvas, exportToJpeg, exportToPdf } from '../exportUtils';
import { ComponentInstance, Wire } from '../../types/circuit';

const { savePdf, pdfOptions, setFillColor, rect, addImage } = vi.hoisted(() => ({
  savePdf: vi.fn(),
  pdfOptions: vi.fn(),
  setFillColor: vi.fn(),
  rect: vi.fn(),
  addImage: vi.fn(),
}));

vi.mock('jspdf', () => ({
  default: class {
    constructor(options: unknown) {
      pdfOptions(options);
    }
    setFillColor = setFillColor;
    rect = rect;
    addImage = addImage;
    save = savePdf;
  },
}));

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

  it('renders a monochrome PDF canvas on a white page', () => {
    const canvasContext = document.createElement('canvas').getContext('2d')!;
    const paintedFills: string[] = [];
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(canvasContext);
    const fillRectSpy = vi.spyOn(canvasContext, 'fillRect').mockImplementation(function (this: CanvasRenderingContext2D) {
      paintedFills.push(String(this.fillStyle));
    });

    renderCircuitToOffscreenCanvas(
      dummyComponents,
      dummyWires,
      () => ['1'],
      () => ['1'],
      { monochrome: true }
    );

    expect(paintedFills[0]).toBe('#ffffff');
    fillRectSpy.mockRestore();
    contextSpy.mockRestore();
  });

  it('triggers JPEG download without errors', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    expect(() => {
      exportToJpeg(dummyComponents, dummyWires, () => ['1'], () => ['1'], 'test.jpg');
    }).not.toThrow();

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('generates PDF file without crashing', async () => {
    await expect(
      exportToPdf(dummyComponents, dummyWires, () => ['1'], () => ['1'], 'test.pdf')
    ).resolves.toBeUndefined();
    expect(savePdf).toHaveBeenCalledWith('test.pdf');
    expect(pdfOptions).toHaveBeenLastCalledWith({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    expect(setFillColor).toHaveBeenLastCalledWith(255, 255, 255);
    expect(rect).toHaveBeenLastCalledWith(0, 0, 297, 210, 'F');
    const [, , x, y, width, height] = addImage.mock.lastCall!;
    expect(x).toBeGreaterThanOrEqual(12);
    expect(y).toBeGreaterThanOrEqual(12);
    expect(x + width).toBeLessThanOrEqual(297 - 12);
    expect(y + height).toBeLessThanOrEqual(210 - 12);
  });

  it('uses portrait A4 when the circuit bounding box is taller than it is wide', async () => {
    await exportToPdf(
      [
        { id: 'top', type: 'PIN_INPUT', x: 0, y: 0 },
        { id: 'bottom', type: 'PIN_OUTPUT', x: 0, y: 1200 },
      ],
      [],
      () => ['0'],
      () => ['0'],
      'tall.pdf'
    );

    expect(pdfOptions).toHaveBeenLastCalledWith({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    expect(rect).toHaveBeenLastCalledWith(0, 0, 210, 297, 'F');
  });
});
