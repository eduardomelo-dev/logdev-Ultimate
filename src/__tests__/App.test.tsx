import { beforeEach, describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { useCircuitStore } from '../store/circuitStore';

describe('App Layout', () => {
  beforeEach(() => {
    useCircuitStore.getState().resetCircuit();
    useCircuitStore.setState({ zoom: 1, pan: { x: 0, y: 0 } });
  });

  it('renders header, component sidebar, and canvas area', () => {
    render(<App />);
    expect(screen.getByRole('img', { name: 'Logdev Ultimate' })).toBeInTheDocument();
    expect(screen.getAllByText(/logdev/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Ultimate/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Buscar componentes/i)).toBeDefined();
    expect(screen.getByText(/Portas Lógicas/i)).toBeDefined();
  });

  it('guides a new user through the first circuit and makes connect mode explicit', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Comece um circuito' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Adicionar uma entrada/i }));
    expect(useCircuitStore.getState().pendingComponentType).toBe('PIN_INPUT');

    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));
    expect(useCircuitStore.getState().tool).toBe('wire');
    expect(screen.getByText('Conectar portas')).toBeInTheDocument();
  });

  it('opens the combinational analysis and displays its truth table and expression', () => {
    useCircuitStore.getState().loadCircuit({
      components: [
        { id: 'input-a', type: 'PIN_INPUT', x: 0, y: 0, label: 'Entrada A', state: { value: ['0'] } },
        { id: 'input-b', type: 'PIN_INPUT', x: 0, y: 40, label: 'Entrada B', state: { value: ['0'] } },
        { id: 'gate-and', type: 'AND', x: 80, y: 0, inputs: 2 },
        { id: 'output-y', type: 'PIN_OUTPUT', x: 160, y: 0, label: 'Saída Y' },
      ],
      wires: [
        { id: 'wire-a', from: { componentId: 'input-a', portId: 'out' }, to: { componentId: 'gate-and', portId: 'in0' }, points: [] },
        { id: 'wire-b', from: { componentId: 'input-b', portId: 'out' }, to: { componentId: 'gate-and', portId: 'in1' }, points: [] },
        { id: 'wire-y', from: { componentId: 'gate-and', portId: 'out' }, to: { componentId: 'output-y', portId: 'in' }, points: [] },
      ],
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Analisar$/i }));
    expect(screen.getByRole('dialog', { name: /Análise e verificação de circuitos/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Analisar circuito' }));

    expect(screen.getByText('Saída Y = A · B')).toBeInTheDocument();
    expect(screen.getByText('Tabela-verdade (4 combinações)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar análise lógica' })).toBeInTheDocument();
  });

  it('records selected signals and displays a chronogram waveform', () => {
    useCircuitStore.getState().loadCircuit({
      components: [
        { id: 'input-a', type: 'PIN_INPUT', x: 0, y: 0, label: 'Entrada A', state: { value: ['0'] } },
        { id: 'output-y', type: 'PIN_OUTPUT', x: 100, y: 0, label: 'Saída Y' },
      ],
      wires: [{
        id: 'wire-a-y',
        from: { componentId: 'input-a', portId: 'out' },
        to: { componentId: 'output-y', portId: 'in' },
        points: [],
      }],
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Analisar$/i }));
    fireEvent.click(screen.getByRole('tab', { name: 'Cronograma' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Entrada A/ }));

    expect(useCircuitStore.getState().signalHistory).toHaveLength(1);
    act(() => useCircuitStore.getState().stepSimulation());
    expect(screen.getByRole('img', { name: /Cronograma de Entrada A/ })).toBeInTheDocument();
    expect(screen.getByText('2 amostras')).toBeInTheDocument();
  });

  it('runs editable test vectors and reports pass/fail status', () => {
    useCircuitStore.getState().loadCircuit({
      components: [
        { id: 'input-a', type: 'PIN_INPUT', x: 0, y: 0, label: 'Entrada A', state: { value: ['0'] } },
        { id: 'input-b', type: 'PIN_INPUT', x: 0, y: 40, label: 'Entrada B', state: { value: ['0'] } },
        { id: 'gate-and', type: 'AND', x: 80, y: 0, inputs: 2 },
        { id: 'output-y', type: 'PIN_OUTPUT', x: 160, y: 0, label: 'Saída Y' },
      ],
      wires: [
        { id: 'wire-a', from: { componentId: 'input-a', portId: 'out' }, to: { componentId: 'gate-and', portId: 'in0' }, points: [] },
        { id: 'wire-b', from: { componentId: 'input-b', portId: 'out' }, to: { componentId: 'gate-and', portId: 'in1' }, points: [] },
        { id: 'wire-y', from: { componentId: 'gate-and', portId: 'out' }, to: { componentId: 'output-y', portId: 'in' }, points: [] },
      ],
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Analisar$/i }));
    fireEvent.click(screen.getByRole('tab', { name: 'Vetores de teste' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Vetor 1 entrada Entrada A' }), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Vetor 1 entrada Entrada B' }), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Vetor 1 esperado Saída Y' }), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Executar' }));

    expect(screen.getByText('1 de 1 vetores passaram.')).toBeInTheDocument();
    expect(screen.getByText('PASSOU')).toBeInTheDocument();
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

  it('places a configurable bus adder from the arithmetic component library', () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Aritmética/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Somador' }));

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    fireEvent.mouseDown(canvas!, { button: 0, clientX: 160, clientY: 120 });

    expect(useCircuitStore.getState().components).toMatchObject([
      { type: 'ADDER', bitWidth: 4 },
    ]);
  });

  it('edits ROM words in the component inspector', () => {
    useCircuitStore.getState().addComponent('ROM', 0, 0);
    render(<App />);

    const memoryEditor = screen.getByRole('textbox', { name: /Conteúdo da ROM/i });
    fireEvent.change(memoryEditor, {
      target: { value: '00000001\n00000010\n00000011\n00000100' },
    });
    fireEvent.blur(memoryEditor);

    const rom = useCircuitStore.getState().components.find(component => component.type === 'ROM');
    expect(rom?.state?.memory).toEqual([
      ['1', '0', '0', '0', '0', '0', '0', '0'],
      ['0', '1', '0', '0', '0', '0', '0', '0'],
      ['1', '1', '0', '0', '0', '0', '0', '0'],
      ['0', '0', '1', '0', '0', '0', '0', '0'],
    ]);
  });

  it('zooms the circuit with a cancellable non-passive wheel listener', () => {
    const { container } = render(<App />);
    const canvas = container.querySelector('canvas')!;
    const wheel = new WheelEvent('wheel', { deltaY: -100, cancelable: true });

    act(() => canvas.dispatchEvent(wheel));

    expect(wheel.defaultPrevented).toBe(true);
    expect(useCircuitStore.getState().zoom).toBeCloseTo(1.1);
    act(() => useCircuitStore.setState({ zoom: 1 }));
  });

  it('inserts a junction at the clicked point on a wire from its context menu', () => {
    useCircuitStore.getState().loadCircuit({
      components: [
        { id: 'wire-source', type: 'PIN_INPUT', x: 0, y: 0 },
        { id: 'wire-sink', type: 'PIN_OUTPUT', x: 120, y: 0 },
      ],
      wires: [{
        id: 'junction-target-wire',
        from: { componentId: 'wire-source', portId: 'out' },
        to: { componentId: 'wire-sink', portId: 'in' },
        points: [{ x: 40, y: 20 }, { x: 120, y: 20 }],
      }],
    });

    const { container } = render(<App />);
    const canvas = container.querySelector('canvas')!;
    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 20 });
    fireEvent.click(screen.getByRole('menuitem', { name: /Inserir junção e criar ramificação/i }));

    const junction = useCircuitStore.getState().components.find(component => component.type === 'JUNCTION');
    expect(junction).toMatchObject({ x: 70, y: 10 });
    expect(useCircuitStore.getState().selectedIds).toEqual([junction?.id]);
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