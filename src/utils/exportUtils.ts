import jsPDF from 'jspdf';
import { ComponentInstance, Wire } from '../types/circuit';
import { COMPONENT_METADATA } from '../engine/components';
import { renderComponent, renderWire } from '../canvas/renderer';

export interface ExportOptions {
  title?: string;
  backgroundColor?: string;
}

/**
 * Creates an offscreen canvas rendering the entire bounding box of components and wires
 * with clean margins, suitable for PDF and JPEG export.
 */
export function renderCircuitToOffscreenCanvas(
  components: ComponentInstance[],
  wires: Wire[],
  getPinValue: (compId: string, portId: string) => any,
  getNetValue: (compId: string, portId: string) => any,
  options: ExportOptions = {}
): HTMLCanvasElement {
  const bgColor = options.backgroundColor || '#0b0f19';
  const padding = 60;

  // Determine bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  if (components.length === 0 && wires.length === 0) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  } else {
    for (const c of components) {
      const meta = COMPONENT_METADATA[c.type];
      const w = meta ? meta.width : 60;
      const h = meta ? meta.height : 50;
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x + w > maxX) maxX = c.x + w;
      if (c.y + h > maxY) maxY = c.y + h;
    }

    for (const w of wires) {
      for (const p of w.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }
  }

  // Add minimum dimension constraints
  const contentWidth = Math.max(400, maxX - minX);
  const contentHeight = Math.max(300, maxY - minY);

  const canvasWidth = contentWidth + padding * 2;
  const canvasHeight = contentHeight + padding * 2 + 50; // extra space for header/footer

  const canvas = document.createElement('canvas');
  // Scale for high DPI / print resolution (2x)
  const scale = 2;
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Header Title
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#38bdf8'; // Cyan
  ctx.fillText(options.title || 'logdev-Ultimate — Diagrama de Circuito Lógico', padding, 36);

  ctx.font = '11px monospace';
  ctx.fillStyle = '#64748b';
  const now = new Date().toLocaleString();
  ctx.fillText(`Gerado em: ${now} | Componentes: ${components.length} | Fios: ${wires.length}`, padding, 52);

  // Subtle separator line
  ctx.beginPath();
  ctx.moveTo(padding, 60);
  ctx.lineTo(canvasWidth - padding, 60);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Translate to content area
  ctx.save();
  const offsetX = padding - minX;
  const offsetY = padding + 20 - minY;
  ctx.translate(offsetX, offsetY);

  // Render Wires
  for (const w of wires) {
    const val = getNetValue(w.from.componentId, w.from.portId);
    renderWire(ctx, w, val, false);
  }

  // Render Components
  for (const c of components) {
    renderComponent(ctx, c, false, (compId, portId) => getPinValue(compId, portId));
  }

  ctx.restore();

  // Footer Watermark
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'right';
  ctx.fillText('logdev-Ultimate Digital Logic CAD', canvasWidth - padding, canvasHeight - 15);

  return canvas;
}

/**
 * Exports the circuit directly as a high-resolution JPEG image file.
 */
export function exportToJpeg(
  components: ComponentInstance[],
  wires: Wire[],
  getPinValue: (compId: string, portId: string) => any,
  getNetValue: (compId: string, portId: string) => any,
  filename = `circuito_logdev_${Date.now()}.jpg`
) {
  const canvas = renderCircuitToOffscreenCanvas(components, wires, getPinValue, getNetValue);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

/**
 * Exports the circuit as a vector-ready A4 PDF document using jsPDF.
 */
export function exportToPdf(
  components: ComponentInstance[],
  wires: Wire[],
  getPinValue: (compId: string, portId: string) => any,
  getNetValue: (compId: string, portId: string) => any,
  filename = `circuito_logdev_${Date.now()}.pdf`
) {
  const canvas = renderCircuitToOffscreenCanvas(components, wires, getPinValue, getNetValue);
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  // Landscape A4: 297mm x 210mm
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 10;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  const imgAspect = canvas.width / canvas.height;
  let renderWidth = maxWidth;
  let renderHeight = renderWidth / imgAspect;

  if (renderHeight > maxHeight) {
    renderHeight = maxHeight;
    renderWidth = renderHeight * imgAspect;
  }

  const posX = (pageWidth - renderWidth) / 2;
  const posY = (pageHeight - renderHeight) / 2;

  // Set dark PDF page background
  pdf.setFillColor(11, 15, 25);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Insert image
  pdf.addImage(imgData, 'JPEG', posX, posY, renderWidth, renderHeight);

  pdf.save(filename);
}
