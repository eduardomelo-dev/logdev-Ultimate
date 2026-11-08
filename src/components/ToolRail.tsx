import React from 'react';
import { Cable, Hand, MousePointer } from 'lucide-react';
import { useCircuitStore } from '../store/circuitStore';

const TOOLS = [
  { id: 'select', label: 'Selecionar', icon: MousePointer, title: 'Arraste no canvas para selecionar elementos.' },
  { id: 'wire', label: 'Conectar', icon: Cable, title: 'Conecte uma porta de origem a uma porta de destino.' },
  { id: 'poke', label: 'Interagir', icon: Hand, title: 'Clique em chaves e pinos para interagir.' },
] as const;

export const ToolRail: React.FC = () => {
  const { tool, setTool } = useCircuitStore();

  return (
    <nav className="workspace-toolrail" aria-label="Ferramentas de edição">
      <span className="workspace-toolrail-label">EDITAR</span>
      {TOOLS.map(({ id, label, icon: Icon, title }) => (
        <button
          key={id}
          type="button"
          aria-pressed={tool === id}
          aria-label={label}
          title={title}
          onClick={() => setTool(id)}
          className="workspace-tool-button"
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
};
