import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COMPONENT_METADATA } from '../engine/components';
import { getPortWorldPosition, rotateDirection } from '../engine/componentGeometry';
import { useCircuitStore } from '../store/circuitStore';
import { BitVector, CircuitState, ComponentInstance, Point, WireEndpoint } from '../types/circuit';
import {
  GRID_SIZE,
  hitTestComponent,
  hitTestPort,
  renderComponent,
  renderGrid,
  renderWire
} from './renderer';
import { getMarqueeSelectedIds } from './selection';
import { getClosestPointOnWire, hitTestWire, routeOrthogonalWire } from './wireRouter';

interface CanvasContextMenu {
  x: number;
  y: number;
  world: Point;
}

export const CircuitCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    components,
    wires,
    selectedIds,
    pendingComponentType,
    tool,
    zoom,
    pan,
    simulator,
    isSimulating,
    setPan,
    setZoom,
    selectElement,
    clearSelection,
    updateComponent,
    moveComponents,
    setPendingComponentType,
    setSelectedIds,
    addWire,
    addJunctionAt,
    togglePinValue,
    addComponent,
    removeSelected,
    createSubcircuitFromSelection,
    enterSubcircuit,
    undo,
    redo,
  } = useCircuitStore();

  // Dragging state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  const [draggedCompIds, setDraggedCompIds] = useState<string[]>([]);
  const dragStartWorld = useRef<Point>({ x: 0, y: 0 });
  const dragStartPositions = useRef<Map<string, Point>>(new Map());
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{ start: Point; end: Point } | null>(null);
  const selectionStart = useRef<Point | null>(null);
  const selectionEnd = useRef<Point | null>(null);
  const selectionAdditive = useRef(false);
  const clipboard = useRef<CircuitState | null>(null);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenu | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

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

  const getPlacementPosition = (type: ComponentInstance['type'], pointer: Point): Point => {
    const metadata = COMPONENT_METADATA[type];
    return {
      x: snapToGrid(pointer.x - metadata.width / 2),
      y: snapToGrid(pointer.y - metadata.height / 2),
    };
  };

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | undefined;

    const render = (timestamp: number) => {
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

      // 2. Draw Wires with Net Voltage Coloring (detecting contention 'X')
      for (const w of wires) {
        const val = simulator.getNetValue(w.from.componentId, w.from.portId);
        const isSelected = selectedIds.includes(w.id);
        const fromComponent = components.find(component => component.id === w.from.componentId);
        const fromPort = fromComponent && COMPONENT_METADATA[fromComponent.type]
          .getPorts(fromComponent.inputs, fromComponent.bitWidth, fromComponent)
          .find(port => port.id === w.from.portId);
        renderWire(
          ctx,
          w,
          val,
          isSelected,
          timestamp / 35 % 16,
          isSimulating,
          fromPort?.type === 'in'
        );
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

      if (pendingComponentType) {
        const placement = getPlacementPosition(pendingComponentType, currentMousePos);
        const preview: ComponentInstance = {
          id: 'placement-preview',
          type: pendingComponentType,
          ...placement,
          direction: 'EAST',
        };
        ctx.save();
        ctx.globalAlpha = 0.55;
        renderComponent(ctx, preview, false, () => ['Z'] as BitVector);
        ctx.restore();
      }

      if (selectionRect) {
        const left = Math.min(selectionRect.start.x, selectionRect.end.x);
        const top = Math.min(selectionRect.start.y, selectionRect.end.y);
        const width = Math.abs(selectionRect.end.x - selectionRect.start.x);
        const height = Math.abs(selectionRect.end.y - selectionRect.start.y);
        const isCrossing = selectionRect.end.x < selectionRect.start.x;
        ctx.save();
        ctx.fillStyle = isCrossing ? 'rgba(34, 197, 94, 0.12)' : 'rgba(56, 189, 248, 0.12)';
        ctx.strokeStyle = isCrossing ? '#4ade80' : '#38bdf8';
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.fillRect(left, top, width, height);
        ctx.strokeRect(left, top, width, height);
        ctx.restore();
      }

      ctx.restore();

      if (isSimulating || isPanning || draggedCompIds.length > 0 || activeWireStart !== null) {
        animId = requestAnimationFrame(render);
      }
    };

    render(0);

    return () => {
      if (animId !== undefined) cancelAnimationFrame(animId);
    };
  }, [
    components, wires, selectedIds, pan, zoom, activeWireStart, currentMousePos,
    simulator, isSimulating, isPanning, draggedCompIds, pendingComponentType, selectionRect,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
      setZoom(previous => Math.max(0.3, Math.min(2.5, previous * zoomFactor)));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [setZoom]);

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);
    setContextMenu(null);

    // Pan with middle click, Alt+drag, or Shift+drag.
    if (e.button === 1 || e.altKey || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: screenX - pan.x, y: screenY - pan.y });
      return;
    }

    if (e.button !== 0) return;

    if (pendingComponentType) {
      const placement = getPlacementPosition(pendingComponentType, world);
      addComponent(pendingComponentType, placement.x, placement.y);
      setPendingComponentType(null);
      setCurrentMousePos(world);
      return;
    }

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

    // 2. Check Port Hit (adaptive hit radius for zoom)
    const adaptivePortRadius = 8 / Math.max(0.4, zoom);
    for (const c of components) {
      const hitPort = hitTestPort(c, world, adaptivePortRadius);
      if (hitPort) {
        const portWorldX = c.x + hitPort.relX;
        const portWorldY = c.y + hitPort.relY;

        if (!activeWireStart) {
          setActiveWireStart({
            endpoint: { componentId: c.id, portId: hitPort.id },
            startPoint: { x: portWorldX, y: portWorldY },
          });
          setCurrentMousePos(world);
          return;
        }

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

    // If clicked empty space while drawing wire, cancel wire.
    if (activeWireStart) {
      setActiveWireStart(null);
      return;
    }

    // 3. Check Component Hit (for selection / dragging)
    for (let i = components.length - 1; i >= 0; i--) {
      const c = components[i];
      if (!hitTestComponent(c, world)) continue;

      const additive = e.ctrlKey || e.metaKey;
      const wasSelected = selectedIds.includes(c.id);
      if (additive && wasSelected) {
        selectElement(c.id, true);
        return;
      }
      if (!wasSelected) selectElement(c.id, additive);

      const componentIds = additive
        ? [...new Set([...selectedIds, c.id])]
        : wasSelected ? selectedIds : [c.id];
      const draggedComponents = components.filter(component => componentIds.includes(component.id));
      setDraggedCompIds(draggedComponents.map(component => component.id));
      dragStartWorld.current = world;
      dragStartPositions.current = new Map(
        draggedComponents.map(component => [component.id, { x: component.x, y: component.y }])
      );
      setHasMovedDuringDrag(false);
      return;
    }

    // 4. Check Wire Hit (for selecting wires)
    const wireHitTolerance = 6 / Math.max(0.4, zoom);
    for (let i = wires.length - 1; i >= 0; i--) {
      const w = wires[i];
      if (hitTestWire(w, world, wireHitTolerance)) {
        selectElement(w.id, e.ctrlKey || e.metaKey);
        return;
      }
    }

    // Empty-space drags select a window; Shift or Alt + drag remains available for panning.
    selectionStart.current = world;
    selectionEnd.current = world;
    selectionAdditive.current = e.ctrlKey || e.metaKey;
    setSelectionRect({ start: world, end: world });
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

    if (selectionStart.current) {
      selectionEnd.current = world;
      setSelectionRect({ start: selectionStart.current, end: world });
      return;
    }

    if (isPanning) {
      setPan({
        x: screenX - panStart.x,
        y: screenY - panStart.y,
      });
      return;
    }

    if (draggedCompIds.length > 0) {
      setHasMovedDuringDrag(true);
      const deltaX = snapToGrid(world.x - dragStartWorld.current.x);
      const deltaY = snapToGrid(world.y - dragStartWorld.current.y);
      const draggedSet = new Set(draggedCompIds);

      for (const component of components) {
        const start = dragStartPositions.current.get(component.id);
        if (!start) continue;
        component.x = start.x + deltaX;
        component.y = start.y + deltaY;
      }

      const connectedWires = wires.filter(
        wire => draggedSet.has(wire.from.componentId) || draggedSet.has(wire.to.componentId)
      );
      for (const wire of connectedWires) {
        const fromComponent = components.find(component => component.id === wire.from.componentId);
        const toComponent = components.find(component => component.id === wire.to.componentId);
        if (!fromComponent || !toComponent) continue;
        const from = getPortWorldPosition(fromComponent, wire.from.portId);
        const to = getPortWorldPosition(toComponent, wire.to.portId);
        if (from && to) wire.points = routeOrthogonalWire(from, to);
      }
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    setIsPanning(false);
    if (selectionStart.current) {
      const start = selectionStart.current;
      const end = selectionEnd.current ?? start;
      if (Math.hypot(end.x - start.x, end.y - start.y) > 3) {
        const marqueeIds = getMarqueeSelectedIds(components, wires, start, end);
        setSelectedIds(selectionAdditive.current
          ? [...selectedIds, ...marqueeIds]
          : marqueeIds);
      } else if (!selectionAdditive.current) {
        clearSelection();
      }
      selectionStart.current = null;
      selectionEnd.current = null;
      setSelectionRect(null);
    }

    if (draggedCompIds.length > 0 && hasMovedDuringDrag) {
      const finalPositions = draggedCompIds.flatMap(id => {
        const component = components.find(item => item.id === id);
        const start = dragStartPositions.current.get(id);
        return component && start && (component.x !== start.x || component.y !== start.y)
          ? [{ id, x: component.x, y: component.y }]
          : [];
      });
      if (finalPositions.length > 0) moveComponents(finalPositions);
    }
    setDraggedCompIds([]);
    dragStartPositions.current.clear();
    setHasMovedDuringDrag(false);
  };

  const copySelection = useCallback((): boolean => {
    const state = useCircuitStore.getState();
    const selectedComponents = state.components.filter(component => state.selectedIds.includes(component.id));
    if (selectedComponents.length === 0) return false;
    const componentIds = new Set(selectedComponents.map(component => component.id));
    const selectedWires = state.wires.filter(
      wire => componentIds.has(wire.from.componentId) && componentIds.has(wire.to.componentId)
    );
    clipboard.current = JSON.parse(JSON.stringify({
      components: selectedComponents,
      wires: selectedWires,
    })) as CircuitState;
    return true;
  }, []);

  const cutSelection = useCallback(() => {
    if (copySelection()) useCircuitStore.getState().removeSelected();
  }, [copySelection]);

  const pasteAt = useCallback((anchor?: Point) => {
    if (!clipboard.current) return;
    const snappedAnchor = anchor
      ? { x: snapToGrid(anchor.x), y: snapToGrid(anchor.y) }
      : undefined;
    useCircuitStore.getState().pasteCircuit(clipboard.current, snappedAnchor);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const world = screenToWorld(x, y);

    for (let i = components.length - 1; i >= 0; i--) {
      if (hitTestComponent(components[i], world)) {
        if (!selectedIds.includes(components[i].id)) selectElement(components[i].id);
        setContextMenu({ x, y, world });
        return;
      }
    }

    const tolerance = 6 / Math.max(0.4, zoom);
    for (let i = wires.length - 1; i >= 0; i--) {
      if (hitTestWire(wires[i], world, tolerance)) {
        if (!selectedIds.includes(wires[i].id)) selectElement(wires[i].id);
        setContextMenu({ x, y, world });
        return;
      }
    }

    setContextMenu({ x, y, world });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const component = [...components].reverse().find(item => hitTestComponent(item, world));
    if (component?.type === 'SUBCIRCUIT' && component.subcircuit) {
      enterSubcircuit(component.id);
      setContextMenu(null);
    }
  };

  useEffect(() => {
    if (!contextMenu) return;
    const dismissMenu = (event: MouseEvent) => {
      if (!contextMenuRef.current?.contains(event.target as Node)) setContextMenu(null);
    };
    window.addEventListener('mousedown', dismissMenu);
    return () => window.removeEventListener('mousedown', dismissMenu);
  }, [contextMenu]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLElement
        && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        cutSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteAt(currentMousePos);
        return;
      }
      if (e.key.toLowerCase() === 'r') {
        const selectedComponent = components.find(component => selectedIds.includes(component.id));
        if (selectedComponent) {
          updateComponent(selectedComponent.id, {
            direction: rotateDirection(selectedComponent.direction),
          });
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        removeSelected();
      } else if (e.key === 'Escape') {
        setActiveWireStart(null);
        setPendingComponentType(null);
        setSelectionRect(null);
        selectionStart.current = null;
        selectionEnd.current = null;
        setContextMenu(null);
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    removeSelected, clearSelection, undo, redo, components, selectedIds, updateComponent,
    copySelection, cutSelection, pasteAt, currentMousePos, setPendingComponentType,
  ]);

  const hasSelectedComponents = components.some(component => selectedIds.includes(component.id));
  const selectedSubcircuit = components.find(component =>
    selectedIds.includes(component.id) && component.type === 'SUBCIRCUIT' && component.subcircuit
  );
  const selectedWire = wires.find(wire => selectedIds.includes(wire.id));

  return (
    <div className="nexus-canvas relative w-full h-full overflow-hidden select-none bg-slate-900">
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${pendingComponentType ? 'cursor-crosshair' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
      />
      {components.length === 0 && !pendingComponentType && (
        <section className="empty-canvas-card rounded-xl border border-slate-700 bg-slate-900/95 p-5 text-slate-200 shadow-2xl shadow-slate-950/50">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
            Seu espaço de trabalho
          </div>
          <h2 className="text-lg font-semibold text-white">Comece um circuito</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Monte a lógica colocando componentes no canvas e conectando suas portas.
          </p>
          <button
            type="button"
            onClick={() => setPendingComponentType('PIN_INPUT')}
            className="pointer-events-auto mt-4 w-full rounded-lg border border-cyan-700/70 bg-cyan-950/50 px-3 py-2 text-left text-xs font-medium text-cyan-200 transition hover:border-cyan-500 hover:bg-cyan-900/50"
          >
            1. Adicionar uma entrada
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] leading-relaxed text-slate-400">
            <div className="rounded-md bg-slate-800/70 p-2">
              <span className="mb-0.5 block font-semibold text-slate-200">2. Escolha a lógica</span>
              Abra uma categoria na biblioteca à esquerda.
            </div>
            <div className="rounded-md bg-slate-800/70 p-2">
              <span className="mb-0.5 block font-semibold text-slate-200">3. Faça a ligação</span>
              Clique em duas portas para conectar.
            </div>
          </div>
        </section>
      )}
      {contextMenu && (
        <div
          role="menu"
          aria-label="Ações do elemento selecionado"
          ref={contextMenuRef}
          className="absolute z-30 min-w-40 rounded-md border border-slate-700 bg-slate-900 p-1 shadow-xl"
          style={{
            left: Math.min(contextMenu.x, Math.max(0, (canvasRef.current?.clientWidth ?? 200) - 164)),
            top: Math.min(contextMenu.y, Math.max(0, (canvasRef.current?.clientHeight ?? 200) - 268)),
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            disabled={!hasSelectedComponents}
            onClick={() => { cutSelection(); setContextMenu(null); }}
            className="w-full rounded px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Recortar <span className="float-right text-slate-500">Ctrl+X</span>
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!hasSelectedComponents}
            onClick={() => { copySelection(); setContextMenu(null); }}
            className="w-full rounded px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Copiar <span className="float-right text-slate-500">Ctrl+C</span>
          </button>
          {selectedSubcircuit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                enterSubcircuit(selectedSubcircuit.id);
                setContextMenu(null);
              }}
              className="w-full rounded px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
            >
              Editar subcircuito
            </button>
          )}
          {selectedWire && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const junctionPoint = getClosestPointOnWire(selectedWire, contextMenu.world);
                if (!junctionPoint) {
                  alert('Não foi possível localizar o ponto do fio para inserir a junção.');
                } else {
                  addJunctionAt(junctionPoint);
                }
                setContextMenu(null);
              }}
              className="w-full rounded px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
            >
              Inserir junção e criar ramificação
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            disabled={!hasSelectedComponents}
            onClick={() => {
              try {
                createSubcircuitFromSelection();
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Erro inesperado.';
                alert(`Não foi possível criar o subcircuito: ${message}`);
              }
              setContextMenu(null);
            }}
            className="w-full rounded px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Criar subcircuito
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!clipboard.current}
            onClick={() => { pasteAt(contextMenu.world); setContextMenu(null); }}
            className="w-full rounded px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Colar <span className="float-right text-slate-500">Ctrl+V</span>
          </button>
          <div className="my-1 border-t border-slate-800" />
          <button
            type="button"
            role="menuitem"
            disabled={selectedIds.length === 0}
            onClick={() => { removeSelected(); setContextMenu(null); }}
            className="w-full rounded px-3 py-1.5 text-left text-xs text-red-300 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Excluir <span className="float-right text-slate-500">Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};
