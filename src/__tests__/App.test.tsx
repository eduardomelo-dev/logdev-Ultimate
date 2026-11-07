import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from '../App';

describe('App Layout', () => {
  it('renders header, component sidebar, and canvas area', () => {
    render(<App />);
    expect(screen.getByText(/Logisim Studio/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Buscar componentes/i)).toBeDefined();
    expect(screen.getByText(/Portas Lógicas/i)).toBeDefined();
  });
});
