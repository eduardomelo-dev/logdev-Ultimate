import { COMPONENT_METADATA } from '../engine/components';
import { BitVector, ComponentInstance, LogicValue, Point, Port, Wire } from '../types/circuit';

export const GRID_SIZE = 20;

export function getLogicColor(val: LogicValue | undefined): string {
  switch (val) {
    case '1': return '#22c55e'; // Bright Green
    case '0': return '#166534'; // Dark Forest Green
    case 'Z': return '#38bdf8'; // Cyan
    case 'X': return '#ef4444'; // Red
    default: return '#64748b';  // Slate Gray
  }
}

export function renderGrid(ctx: CanvasRenderingContext2D, width: number, height: number, pan: Point, zoom: number) {
  ctx.save();
  ctx.fillStyle = '#0f172a'; // Deep slate dark background
  ctx.fillRect(0, 0, width, height);

  ctx.translate(pan.x, pan.y);
  ctx.scale(zoom, zoom);

  const startX = Math.floor(-pan.x / zoom / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
  const startY = Math.floor(-pan.y / zoom / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
  const endX = startX + (width / zoom) + GRID_SIZE * 2;
  const endY = startY + (height / zoom) + GRID_SIZE * 2;

  ctx.fillStyle = '#334155';
  for (let x = startX; x <= endX; x += GRID_SIZE) {
    for (let y = startY; y <= endY; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function renderWire(
  ctx: CanvasRenderingContext2D,
  wire: Wire,
  value: BitVector | undefined,
  isSelected: boolean
) {
  if (!wire.points || wire.points.length < 2) return;

  const bitVal = value && value.length > 0 ? value[0] : 'Z';
  const color = isSelected ? '#38bdf8' : getLogicColor(bitVal);
  const lineWidth = (wire.bitWidth && wire.bitWidth > 1) ? 4.5 : 2.5;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(wire.points[0].x, wire.points[0].y);
  for (let i = 1; i < wire.points.length; i++) {
    ctx.lineTo(wire.points[i].x, wire.points[i].y);
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Glow if active 1 or X
  if (bitVal === '1' || bitVal === 'X') {
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
  }

  ctx.stroke();

  // Draw dots at junctions
  for (const p of wire.points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, lineWidth / 2 + 1, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  ctx.restore();
}

export function renderComponent(
  ctx: CanvasRenderingContext2D,
  comp: ComponentInstance,
  isSelected: boolean,
  getPinValue: (compId: string, portId: string) => BitVector
) {
  const meta = COMPONENT_METADATA[comp.type];
  if (!meta) return;

  ctx.save();
  ctx.translate(comp.x, comp.y);

  // Selection outline
  if (isSelected) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-6, -6, meta.width + 12, meta.height + 12);
    ctx.setLineDash([]);
  }

  // Draw component body
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#94a3b8'; // Slate border
  ctx.fillStyle = '#1e293b';   // Dark slate fill

  switch (comp.type) {
    case 'AND':
    case 'NAND': {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(meta.width - 25, 0);
      ctx.arc(meta.width - 25, meta.height / 2, meta.height / 2, -Math.PI / 2, Math.PI / 2, false);
      ctx.lineTo(0, meta.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (comp.type === 'NAND') {
        ctx.beginPath();
        ctx.arc(meta.width - 4, meta.height / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'OR':
    case 'NOR': {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(meta.width * 0.6, 0, meta.width - (comp.type === 'NOR' ? 8 : 0), meta.height / 2);
      ctx.quadraticCurveTo(meta.width * 0.6, meta.height, 0, meta.height);
      ctx.quadraticCurveTo(15, meta.height / 2, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (comp.type === 'NOR') {
        ctx.beginPath();
        ctx.arc(meta.width - 4, meta.height / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'NOT': {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(meta.width - 10, meta.height / 2);
      ctx.lineTo(0, meta.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(meta.width - 5, meta.height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'XOR':
    case 'XNOR': {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(meta.width * 0.6, 0, meta.width - (comp.type === 'XNOR' ? 8 : 0), meta.height / 2);
      ctx.quadraticCurveTo(meta.width * 0.6, meta.height, 0, meta.height);
      ctx.quadraticCurveTo(15, meta.height / 2, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Back curved line
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(9, meta.height / 2, -6, meta.height);
      ctx.stroke();

      if (comp.type === 'XNOR') {
        ctx.beginPath();
        ctx.arc(meta.width - 4, meta.height / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'PIN_INPUT':
    case 'SWITCH': {
      const val = comp.state?.value?.[0] || '0';
      ctx.beginPath();
      ctx.roundRect(0, 0, meta.width, meta.height, 6);
      ctx.fillStyle = val === '1' ? '#14532d' : '#1e293b';
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = val === '1' ? '#4ade80' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val, meta.width / 2, meta.height / 2);
      break;
    }

    case 'PIN_OUTPUT':
    case 'PROBE': {
      const val = getPinValue(comp.id, 'in')[0] || 'Z';
      ctx.beginPath();
      ctx.arc(meta.width / 2, meta.height / 2, 16, 0, Math.PI * 2);
      ctx.fillStyle = val === '1' ? '#14532d' : '#1e293b';
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = getLogicColor(val);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val, meta.width / 2, meta.height / 2);
      break;
    }

    case 'CLOCK': {
      const val = comp.state?.value?.[0] || '0';
      ctx.beginPath();
      ctx.roundRect(0, 0, meta.width, meta.height, 6);
      ctx.fill();
      ctx.stroke();

      // Clock pulse glyph
      ctx.beginPath();
      ctx.moveTo(10, 26);
      ctx.lineTo(18, 26);
      ctx.lineTo(18, 14);
      ctx.lineTo(26, 14);
      ctx.lineTo(26, 26);
      ctx.lineTo(32, 26);
      ctx.strokeStyle = val === '1' ? '#22c55e' : '#64748b';
      ctx.stroke();
      break;
    }

    case 'LED': {
      const val = getPinValue(comp.id, 'in')[0] || '0';
      ctx.beginPath();
      ctx.arc(meta.width / 2, meta.height / 2, 14, 0, Math.PI * 2);
      if (val === '1') {
        ctx.fillStyle = '#ef4444'; // Red glow
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
      } else {
        ctx.fillStyle = '#450a0a';
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      break;
    }

    case 'SEVEN_SEGMENT': {
      // 7-segment display with A, B, C, D, E, F, G segments and DP
      ctx.beginPath();
      ctx.roundRect(0, 0, meta.width, meta.height, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.stroke();

      const segVal = (portId: string): boolean => {
        return getPinValue(comp.id, portId)[0] === '1';
      };

      const drawSegment = (x: number, y: number, w: number, h: number, on: boolean) => {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 2);
        ctx.fillStyle = on ? '#ef4444' : '#27272a';
        if (on) {
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      };

      // Segment positions
      drawSegment(16, 12, 28, 5, segVal('a'));      // A (top)
      drawSegment(40, 16, 5, 22, segVal('b'));      // B (top-right)
      drawSegment(40, 42, 5, 22, segVal('c'));      // C (bottom-right)
      drawSegment(16, 63, 28, 5, segVal('d'));      // D (bottom)
      drawSegment(14, 42, 5, 22, segVal('e'));      // E (bottom-left)
      drawSegment(14, 16, 5, 22, segVal('f'));      // F (top-left)
      drawSegment(16, 38, 28, 5, segVal('g'));      // G (middle)

      // Decimal point (DP)
      ctx.beginPath();
      ctx.arc(50, 66, 3, 0, Math.PI * 2);
      ctx.fillStyle = segVal('dp') ? '#ef4444' : '#27272a';
      if (segVal('dp')) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 6;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }

    case 'HEX_DISPLAY': {
      const valVec = getPinValue(comp.id, 'in');
      let hexChar = '-';
      if (!valVec.includes('Z') && !valVec.includes('X')) {
        let num = 0;
        for (let b = 0; b < Math.min(4, valVec.length); b++) {
          if (valVec[b] === '1') num |= (1 << b);
        }
        hexChar = num.toString(16).toUpperCase();
      }

      ctx.beginPath();
      ctx.roundRect(0, 0, meta.width, meta.height, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = hexChar !== '-' ? '#22c55e' : '#475569';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hexChar, meta.width / 2, meta.height / 2 - 4);
      break;
    }

    default: {
      // Standard Box for registers, flip flops, plexers
      ctx.beginPath();
      ctx.roundRect(0, 0, meta.width, meta.height, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(comp.label || comp.type, meta.width / 2, meta.height / 2);
      break;
    }
  }

  // Draw ports
  const ports = meta.getPorts(comp.inputs, comp.bitWidth);
  for (const p of ports) {
    const pVal = getPinValue(comp.id, p.id)[0] || 'Z';
    const portColor = getLogicColor(pVal);

    ctx.beginPath();
    ctx.arc(p.relX, p.relY, 4, 0, Math.PI * 2);
    ctx.fillStyle = portColor;
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

export function hitTestComponent(
  comp: ComponentInstance,
  worldPoint: Point
): boolean {
  const meta = COMPONENT_METADATA[comp.type];
  if (!meta) return false;
  return (
    worldPoint.x >= comp.x &&
    worldPoint.x <= comp.x + meta.width &&
    worldPoint.y >= comp.y &&
    worldPoint.y <= comp.y + meta.height
  );
}

export function hitTestPort(
  comp: ComponentInstance,
  worldPoint: Point,
  radius = 8
): Port | null {
  const meta = COMPONENT_METADATA[comp.type];
  if (!meta) return null;

  const ports = meta.getPorts(comp.inputs, comp.bitWidth);
  for (const p of ports) {
    const px = comp.x + p.relX;
    const py = comp.y + p.relY;
    const dist = Math.hypot(worldPoint.x - px, worldPoint.y - py);
    if (dist <= radius) {
      return p;
    }
  }
  return null;
}
