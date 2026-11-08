import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});