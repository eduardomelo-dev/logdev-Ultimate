import { beforeEach, describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { useCircuitStore } from '../store/circuitStore';

describe('App Layout', () => {
  beforeEach(() => {
    useCircuitStore.getState().resetCircuit();
  });

  it('renders header, component sidebar, and canvas area', () => {
    render(<App />);
    // Use getAllByText since "logdev" appears in both the SVG logo (LOGDEV) and header text
    expect(screen.getAllByText(/logdev/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Ultimate/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Buscar componentes/i)).toBeDefined();
    expect(screen.getByText(/Portas Lógicas/i)).toBeDefined();
  });

  it('starts component categories collapsed and opens them on demand', () => {
    render(<App />);

    const wiringCategory = screen.getByRole('button', { name: /Fiação & Sinais/i });
    const gatesCategory = screen.getByRole('button', { name: /Portas Lógicas/i });

    expect(wiringCategory).toHaveAttribute('aria-expanded', 'false');
    expect(gatesCategory).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Adicionar Pino de Entrada' })).not.toBeInTheDocument();

    fireEvent.click(wiringCategory);

    expect(wiringCategory).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Adicionar Pino de Entrada' })).toBeInTheDocument();
  });

  it('shows a helpful message when component search has no matches', () => {
    render(<App />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar componentes' }), {
      target: { value: 'componente-inexistente' },
    });

    expect(screen.getByText('Nenhum componente encontrado. Tente outro termo.')).toBeInTheDocument();
  });

  it('places a component at the canvas click instead of the viewport center', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Portas Lógicas/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Porta AND' }));

    expect(useCircuitStore.getState().pendingComponentType).toBe('AND');
    expect(useCircuitStore.getState().components).toHaveLength(0);

    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeNull();
    fireEvent.mouseMove(canvas!, { clientX: 300, clientY: 200 });
    fireEvent.mouseDown(canvas!, { button: 0, clientX: 300, clientY: 200 });
    fireEvent.mouseUp(canvas!, { button: 0, clientX: 300, clientY: 200 });

    const placed = useCircuitStore.getState();
    expect(placed.pendingComponentType).toBeNull();
    expect(placed.components[0]).toMatchObject({ type: 'AND', x: 280, y: 180 });
  });

  it('offers context-menu copy, paste, and delete actions for a placed component', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Portas Lógicas/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Porta AND' }));
    const canvas = document.querySelector('canvas')!;
    fireEvent.mouseDown(canvas, { button: 0, clientX: 300, clientY: 200 });
    fireEvent.mouseUp(canvas, { button: 0, clientX: 300, clientY: 200 });

    fireEvent.contextMenu(canvas, { button: 2, clientX: 300, clientY: 200 });
    fireEvent.click(screen.getByRole('menuitem', { name: /Copiar/ }));
    fireEvent.contextMenu(canvas, { button: 2, clientX: 500, clientY: 400 });
    fireEvent.click(screen.getByRole('menuitem', { name: /Colar/ }));

    expect(useCircuitStore.getState().components).toHaveLength(2);
    expect(useCircuitStore.getState().components[1]).toMatchObject({ type: 'AND', x: 500, y: 400 });

    fireEvent.contextMenu(canvas, { button: 2, clientX: 500, clientY: 400 });
    fireEvent.click(screen.getByRole('menuitem', { name: /Excluir/ }));
    expect(useCircuitStore.getState().components).toHaveLength(1);
  });

  it('uses window and crossing drag directions for rectangular selection', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Portas Lógicas/i }));
    const canvas = document.querySelector('canvas')!;
    const placeAt = (x: number, y: number) => {
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar Porta AND' }));
      fireEvent.mouseDown(canvas, { button: 0, clientX: x, clientY: y });
      fireEvent.mouseUp(canvas, { button: 0, clientX: x, clientY: y });
    };
    placeAt(300, 200);
    placeAt(500, 400);
    const [first, second] = useCircuitStore.getState().components;

    fireEvent.mouseDown(canvas, { button: 0, clientX: 270, clientY: 170 });
    fireEvent.mouseMove(canvas, { clientX: 350, clientY: 240 });
    fireEvent.mouseUp(canvas, { button: 0, clientX: 350, clientY: 240 });
    expect(useCircuitStore.getState().selectedIds).toEqual([first.id]);

    fireEvent.mouseDown(canvas, { button: 0, clientX: 550, clientY: 460 });
    fireEvent.mouseMove(canvas, { clientX: 530, clientY: 420 });
    fireEvent.mouseUp(canvas, { button: 0, clientX: 530, clientY: 420 });
    expect(useCircuitStore.getState().selectedIds).toEqual([second.id]);
  });

  it('moves a marquee-selected group together on the grid', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Portas Lógicas/i }));
    const canvas = document.querySelector('canvas')!;
    const placeAt = (x: number, y: number) => {
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar Porta AND' }));
      fireEvent.mouseDown(canvas, { button: 0, clientX: x, clientY: y });
      fireEvent.mouseUp(canvas, { button: 0, clientX: x, clientY: y });
    };
    placeAt(300, 200);
    placeAt(500, 200);
    const original = useCircuitStore.getState().components.map(({ x, y }) => ({ x, y }));

    fireEvent.mouseDown(canvas, { button: 0, clientX: 270, clientY: 170 });
    fireEvent.mouseMove(canvas, { clientX: 550, clientY: 250 });
    fireEvent.mouseUp(canvas, { button: 0, clientX: 550, clientY: 250 });
    expect(useCircuitStore.getState().selectedIds).toHaveLength(2);

    fireEvent.mouseDown(canvas, { button: 0, clientX: 300, clientY: 200 });
    fireEvent.mouseMove(canvas, { clientX: 340, clientY: 240 });
    fireEvent.mouseUp(canvas, { button: 0, clientX: 340, clientY: 240 });
    expect(useCircuitStore.getState().components.map(({ x, y }) => ({ x, y }))).toEqual(
      original.map(({ x, y }) => ({ x: x + 40, y: y + 40 }))
    );
  });
});