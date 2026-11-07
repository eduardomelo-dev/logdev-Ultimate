import React from 'react';
import { Settings, Trash2, Info, Compass, Layers, Hash, Type } from 'lucide-react';
import { COMPONENT_METADATA } from '../engine/components';
import { useCircuitStore } from '../store/circuitStore';
import { Direction } from '../types/circuit';

export const Inspector: React.FC = () => {
  const {
    components,
    wires,
    selectedIds,
    updateComponent,
    removeSelected,
    simulator,
  } = useCircuitStore();

  const selectedComp = components.find((c) => selectedIds.includes(c.id));
  const selectedWire = wires.find((w) => selectedIds.includes(w.id));

  if (!selectedComp && !selectedWire) {
    return (
      <aside className="w-64 bg-slate-900 border-l border-slate-800 p-4 flex flex-col h-[calc(100%-3.5rem)] text-xs text-slate-400 select-none">
        <div className="flex items-center gap-2 text-slate-200 font-semibold mb-3 border-b border-slate-800 pb-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Informações do Circuito</span>
        </div>
        <div className="space-y-3">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span>Total de Componentes:</span>
              <span className="font-mono text-cyan-400 font-bold">{components.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total de Conexões:</span>
              <span className="font-mono text-cyan-400 font-bold">{wires.length}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Selecione qualquer porta lógica, pino ou fio no canvas para visualizar e editar suas propriedades aqui.
          </p>
        </div>
      </aside>
    );
  }

  if (selectedWire) {
    const val = simulator.getPinValue(selectedWire.from.componentId, selectedWire.from.portId);
    return (
      <aside className="w-64 bg-slate-900 border-l border-slate-800 p-4 flex flex-col h-[calc(100%-3.5rem)] text-xs select-none">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>Fio / Conexão</span>
          </div>
          <button
            onClick={removeSelected}
            className="p-1 hover:bg-red-950/40 text-red-400 rounded transition"
            title="Excluir Conexão"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          <div>
            <span className="text-slate-500">Valor Lógico:</span>
            <div className="font-mono text-sm font-bold text-emerald-400 mt-0.5">
              {val.join('')}
            </div>
          </div>
          <div>
            <span className="text-slate-500">De:</span>
            <div className="text-slate-300 font-mono text-[11px]">
              {selectedWire.from.componentId} ({selectedWire.from.portId})
            </div>
          </div>
          <div>
            <span className="text-slate-500">Para:</span>
            <div className="text-slate-300 font-mono text-[11px]">
              {selectedWire.to.componentId} ({selectedWire.to.portId})
            </div>
          </div>
        </div>
      </aside>
    );
  }

  if (!selectedComp) return null;

  const meta = COMPONENT_METADATA[selectedComp.type];
  const isGateWithInputs = ['AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'].includes(selectedComp.type);
  const isBusComponent = ['PIN_INPUT', 'PIN_OUTPUT', 'REGISTER', 'CONSTANT'].includes(selectedComp.type);

  return (
    <aside className="w-64 bg-slate-900 border-l border-slate-800 p-4 flex flex-col h-[calc(100%-3.5rem)] text-xs select-none">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <Settings className="w-4 h-4 text-cyan-400" />
          <span>Inspetor de Propriedades</span>
        </div>
        <button
          onClick={removeSelected}
          className="p-1 hover:bg-red-950/40 text-red-400 rounded transition"
          title="Excluir Componente"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto pr-1">
        {/* Component Header Card */}
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
          <div className="font-semibold text-slate-200">{meta?.name || selectedComp.type}</div>
          <div className="text-[10px] text-slate-500 font-mono">{selectedComp.id}</div>
        </div>

        {/* Label Field */}
        <div>
          <label className="text-slate-400 font-medium mb-1 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-cyan-400" />
            <span>Rótulo (Label)</span>
          </label>
          <input
            type="text"
            value={selectedComp.label || ''}
            onChange={(e) => updateComponent(selectedComp.id, { label: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Number of inputs (if Gate) */}
        {isGateWithInputs && (
          <div>
            <label className="text-slate-400 font-medium mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-cyan-400" />
              <span>Número de Entradas</span>
            </label>
            <select
              value={selectedComp.inputs || 2}
              onChange={(e) => updateComponent(selectedComp.id, { inputs: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {[2, 3, 4, 5, 6, 8].map((n) => (
                <option key={n} value={n}>
                  {n} entradas
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Bit width (if Bus) */}
        {isBusComponent && (
          <div>
            <label className="text-slate-400 font-medium mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Largura de Bits</span>
            </label>
            <select
              value={selectedComp.bitWidth || 1}
              onChange={(e) => updateComponent(selectedComp.id, { bitWidth: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {[1, 2, 4, 8, 16, 32].map((w) => (
                <option key={w} value={w}>
                  {w} {w === 1 ? 'bit' : 'bits'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Direction */}
        <div>
          <label className="text-slate-400 font-medium mb-1 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Orientação (Facing)</span>
          </label>
          <select
            value={selectedComp.direction || 'EAST'}
            onChange={(e) => updateComponent(selectedComp.id, { direction: e.target.value as Direction })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="EAST">Leste (Padrão)</option>
            <option value="SOUTH">Sul</option>
            <option value="WEST">Oeste</option>
            <option value="NORTH">Norte</option>
          </select>
        </div>

        {/* Coordinates */}
        <div className="pt-2 border-t border-slate-800 text-slate-500 flex justify-between font-mono text-[11px]">
          <span>Posição X: {selectedComp.x}</span>
          <span>Posição Y: {selectedComp.y}</span>
        </div>
      </div>
    </aside>
  );
};
