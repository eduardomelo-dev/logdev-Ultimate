import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../App';

describe('App Layout', () => {
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
});