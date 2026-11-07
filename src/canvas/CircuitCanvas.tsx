import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COMPONENT_METADATA } from '../engine/components';
import { useCircuitStore } from '../store/circuitStore';
import { Point, WireEndpoint } from '../types/circuit';
import {
  GRID_SIZE,
  hitTestComponent,
  hitTestPort,
  renderComponent,
  renderGrid,
  renderWire
} from './renderer';
import { routeOrthogonalWire } from './wireRouter';

export const CircuitCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    components,
    wires,
    selectedIds,
    tool,
    zoom,
    pan,
    simulator,
    setPan,
    setZoom,
    selectElement,
    clearSelection,
    updateComponent,
    addWire,
    togglePinValue,
    removeSelected,
  } = useCircuitStore();

  // Dragging state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  const [draggedCompId, setDraggedCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  // Wire drawing state
  const [activeWireStart, setActiveWireStart] = useState<{
    endpoint: WireEndpoint;
    startPoint: Point;
  } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<Point>({ x: 0, y: 0 });

  // Convert screen coordinates to world canvas coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Snap coordinate to grid
  const snapToGrid = (val: number): number => {
    return Math.round(val / GRID_SIZE) * GRID_SIZE;
  };

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // Resize if needed
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Grid
      renderGrid(ctx, canvas.width, canvas.height, pan, zoom);

      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // 2. Draw Wires
      for (const w of wires) {
        const val = simulator.getPinValue(w.from.componentId, w.from.portId);
        const isSelected = selectedIds.includes(w.id);
        renderWire(ctx, w, val, isSelected);
      }

      // Draw wire in-progress
      if (activeWireStart) {
        const tempWirePoints = routeOrthogonalWire(activeWireStart.startPoint, currentMousePos);
        renderWire(ctx, {
          id: 'temp_wire',
          from: activeWireStart.endpoint,
          to: { componentId: '', portId: '' },
          points: tempWirePoints,
        }, ['1'], true);
      }

      // 3. Draw Components
      for (const c of components) {
        const isSelected = selectedIds.includes(c.id);
        renderComponent(ctx, c, isSelected, (compId, portId) => simulator.getPinValue(compId, portId));
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [components, wires, selectedIds, pan, zoom, activeWireStart, currentMousePos, simulator]);

  // Mouse Wheel (Zoom)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.max(0.3, Math.min(2.5, prev * zoomFactor)));
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);

    // Pan with Middle Click or Space Key
    if (e.button === 1 || e.altKey || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setPanStart({ x: screenX - pan.x, y: screenY - pan.y });
      return;
    }

    if (e.button === 0) {
      // 1. Check Poke Tool
      if (tool === 'poke') {
        for (const c of components) {
          if (hitTestComponent(c, world)) {
            togglePinValue(c.id);
            return;
          }
        }
        return;
      }

      // 2. Check Port Hit (for wire drawing)
      for (const c of components) {
        const hitPort = hitTestPort(c, world);
        if (hitPort) {
          const portWorldX = c.x + hitPort.relX;
          const portWorldY = c.y + hitPort.relY;

          if (!activeWireStart) {
            // Start wire
            setActiveWireStart({
              endpoint: { componentId: c.id, portId: hitPort.id },
              startPoint: { x: portWorldX, y: portWorldY },
            });
            return;
          } else {
            // Complete wire if connecting to a different component/port
            if (activeWireStart.endpoint.componentId !== c.id || activeWireStart.endpoint.portId !== hitPort.id) {
              const points = routeOrthogonalWire(activeWireStart.startPoint, { x: portWorldX, y: portWorldY });
              addWire(
                activeWireStart.endpoint,
                { componentId: c.id, portId: hitPort.id },
                points
              );
            }
            setActiveWireStart(null);
            return;
          }
        }
      }

      // If clicked empty space while drawing wire, cancel wire
      if (activeWireStart) {
        setActiveWireStart(null);
        return;
      }

      // 3. Check Component Hit (for selection / dragging)
      for (let i = components.length - 1; i >= 0; i--) {
        const c = components[i];
        if (hitTestComponent(c, world)) {
          selectElement(c.id, e.ctrlKey || e.metaKey);
          setDraggedCompId(c.id);
          setDragOffset({ x: world.x - c.x, y: world.y - c.y });
          return;
        }
      }

      // 4. Clicked empty space -> start panning or clear selection
      clearSelection();
      setIsPanning(true);
      setPanStart({ x: screenX - pan.x, y: screenY - pan.y });
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);

    setCurrentMousePos(world);

    if (isPanning) {
      setPan({
        x: screenX - panStart.x,
        y: screenY - panStart.y,
      });
      return;
    }

    if (draggedCompId) {
      const newX = snapToGrid(world.x - dragOffset.x);
      const newY = snapToGrid(world.y - dragOffset.y);

      updateComponent(draggedCompId, { x: newX, y: newY });

      // Update connected wires
      const comp = components.find(c => c.id === draggedCompId);
      if (comp) {
        const meta = COMPONENT_METADATA[comp.type];
        if (meta) {
          // Re-route connected wires
          const connectedWires = wires.filter(
            w => w.from.componentId === draggedCompId || w.to.componentId === draggedCompId
          );
          for (const w of connectedWires) {
            const fromComp = components.find(c => c.id === w.from.componentId);
            const toComp = components.find(c => c.id === w.to.componentId);
            if (!fromComp || !toComp) continue;

            const fromPort = COMPONENT_METADATA[fromComp.type]?.getPorts(fromComp.inputs, fromComp.bitWidth).find(p => p.id === w.from.portId);
            const toPort = COMPONENT_METADATA[toComp.type]?.getPorts(toComp.inputs, toComp.bitWidth).find(p => p.id === w.to.portId);
            if (!fromPort || !toPort) continue;

            const fromX = (fromComp.id === draggedCompId ? newX : fromComp.x) + fromPort.relX;
            const fromY = (fromComp.id === draggedCompId ? newY : fromComp.y) + fromPort.relY;
            const toX = (toComp.id === draggedCompId ? newX : toComp.x) + toPort.relX;
            const toY = (toComp.id === draggedCompId ? newY : toComp.y) + toPort.relY;

            w.points = routeOrthogonalWire({ x: fromX, y: fromY }, { x: toX, y: toY });
          }
        }
      }
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedCompId(null);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        removeSelected();
      } else if (e.key === 'Escape') {
        setActiveWireStart(null);
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [removeSelected, clearSelection]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-900">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair block"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
};
