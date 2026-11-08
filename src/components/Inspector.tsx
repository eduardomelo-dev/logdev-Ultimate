import React, { useEffect, useState } from 'react';
import { Settings, Trash2, Info, Compass, Layers, Hash, Type, RotateCw, AlertTriangle } from 'lucide-react';
import { COMPONENT_METADATA } from '../engine/components';
import { rotateDirection } from '../engine/componentGeometry';
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
  const [romDraft, setRomDraft] = useState('');
  const [romError, setRomError] = useState('');

  useEffect(() => {
    if (selectedComp?.type !== 'ROM') {
      setRomDraft('');
      setRomError('');
      return;
    }

    const wordWidth = selectedComp.bitWidth ?? 8;
    const wordCount = 2 ** (selectedComp.inputs ?? 2);
    setRomDraft(Array.from({ length: wordCount }, (_, address) => {
      const word = selectedComp.state?.memory?.[address] ?? Array(wordWidth).fill('0');
      return [...word].reverse().join('');
    }).join('\n'));
    setRomError('');
  }, [selectedComp?.id, selectedComp?.type, selectedComp?.inputs, selectedComp?.bitWidth]);

  if (!selectedComp && !selectedWire) {
    return (
      <aside className="w-64 shrink-0 min-h-0 bg-slate-900 border-l border-slate-800 p-4 flex flex-col overflow-y-auto text-xs text-slate-400 select-none">
        <div className="flex items-center gap-2 text-slate-200 font-semibold mb-3 border-b border-slate-800 pb-2">
          <Info className="w-4 h-4 text-slate-400" />
          <span>Informações do Circuito</span>
        </div>
        <div className="space-y-3">
          {simulator.getDiagnostics().length > 0 && (
            <section className="bg-red-950/30 p-3 rounded-lg border border-red-900/60 space-y-2" aria-label="Diagnósticos da simulação">
              <div className="flex items-center gap-2 text-red-300 font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>Diagnósticos da simulação</span>
              </div>
              {simulator.getDiagnostics().map((diagnostic, index) => (
                <p key={`${diagnostic.type}-${index}`} className="text-[11px] text-red-200/90">
                  {diagnostic.message}
                </p>
              ))}
            </section>
          )}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span>Total de Componentes:</span>
              <span className="font-mono text-slate-200 font-bold">{components.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total de Conexões:</span>
              <span className="font-mono text-slate-200 font-bold">{wires.length}</span>
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
      <aside className="w-64 shrink-0 min-h-0 bg-slate-900 border-l border-slate-800 p-4 flex flex-col overflow-y-auto text-xs select-none">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Settings className="w-4 h-4 text-slate-400" />
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
  const isConfigurablePlexer = selectedComp.type === 'MULTIPLEXER' || selectedComp.type === 'DEMULTIPLEXER';
  const isMemory = selectedComp.type === 'RAM' || selectedComp.type === 'ROM';
  const isConfigurableWidthComponent = [
    'PIN_INPUT', 'PIN_OUTPUT', 'REGISTER', 'CONSTANT', 'ADDER', 'SPLITTER',
    'DECODER', 'PRIORITY_ENCODER', 'MULTIPLEXER', 'DEMULTIPLEXER', 'RAM', 'ROM',
  ].includes(selectedComp.type);

  return (
    <aside className="w-64 shrink-0 min-h-0 bg-slate-900 border-l border-slate-800 p-4 flex flex-col text-xs select-none">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <Settings className="w-4 h-4 text-slate-400" />
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

      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
        {/* Component Header Card */}
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
          <div className="font-semibold text-slate-200">{meta?.name || selectedComp.type}</div>
          <div className="text-[10px] text-slate-500 font-mono">{selectedComp.id}</div>
        </div>

        {/* Label Field */}
        <div>
          <label className="text-slate-400 font-medium mb-1 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-slate-400" />
            <span>Rótulo (Label)</span>
          </label>
          <input
            type="text"
            value={selectedComp.label || ''}
            onChange={(e) => updateComponent(selectedComp.id, { label: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-slate-500"
          />
        </div>

        {/* Number of inputs (if Gate) */}
        {(isGateWithInputs || isConfigurablePlexer || isMemory) && (
          <div>
            <label className="text-slate-400 font-medium mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {isMemory
                  ? 'Bits de Endereço'
                  : selectedComp.type === 'DEMULTIPLEXER' ? 'Número de Saídas' : 'Número de Entradas'}
              </span>
            </label>
            <select
              value={selectedComp.inputs || 2}
              onChange={(e) => updateComponent(selectedComp.id, { inputs: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-slate-500"
            >
              {(isMemory ? [1, 2, 3, 4, 5] : isConfigurablePlexer ? [2, 4, 8] : [2, 3, 4, 5, 6, 8]).map((n) => (
                <option key={n} value={n}>
                  {isMemory ? `${n} bit(s) (${2 ** n} posições)` : `${n} entradas`}
                </option>
              ))}
            </select>
          </div>

        )}

        {/* Bit width (if Bus) */}
        {isConfigurableWidthComponent && (
          <div>
            <label className="text-slate-400 font-medium mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {selectedComp.type === 'DECODER'
                  ? 'Bits de Endereço'
                  : selectedComp.type === 'PRIORITY_ENCODER'
                    ? 'Linhas de Entrada'
                    : isMemory
                      ? 'Largura dos Dados'
                    : isConfigurablePlexer
                      ? 'Largura dos Dados'
                    : selectedComp.type === 'SPLITTER'
                      ? 'Largura do Barramento'
                      : 'Largura de Bits'}
              </span>
            </label>
            <select
              value={['SPLITTER', 'PRIORITY_ENCODER'].includes(selectedComp.type)
                ? Math.max(2, selectedComp.bitWidth ?? (selectedComp.type === 'SPLITTER' ? 2 : 4))
                : selectedComp.type === 'DECODER'
                  ? Math.max(1, selectedComp.bitWidth ?? 2)
                  : selectedComp.bitWidth || 1}
              onChange={(e) => updateComponent(selectedComp.id, { bitWidth: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-slate-500"
            >
              {(selectedComp.type === 'SPLITTER' || selectedComp.type === 'PRIORITY_ENCODER'
                ? [2, 4, 8, 16, 32]
                : selectedComp.type === 'DECODER' ? [1, 2, 3, 4, 5] : [1, 2, 4, 8, 16, 32]
              ).map((w) => (
                <option key={w} value={w}>
                  {w} {w === 1 ? 'bit' : 'bits'}
                </option>
              ))}
            </select>
          </div>

        )}

        {selectedComp.type === 'ROM' && (
          <div>
            <label className="text-slate-400 font-medium mb-1 block" htmlFor="rom-memory">
              Conteúdo da ROM (binário, MSB primeiro)
            </label>
            <textarea
              id="rom-memory"
              value={romDraft}
              onChange={(event) => {
                setRomDraft(event.target.value);
                setRomError('');
              }}
              onBlur={() => {
                const words = romDraft.trim().split(/\s+/);
                const wordWidth = selectedComp.bitWidth ?? 8;
                const wordCount = 2 ** (selectedComp.inputs ?? 2);
                if (words.length !== wordCount
                  || words.some(word => word.length !== wordWidth || !/^[01XZ]+$/i.test(word))) {
                  setRomError(`Informe ${wordCount} palavras de ${wordWidth} bits (0, 1, X ou Z).`);
                  return;
                }

                updateComponent(selectedComp.id, {
                  state: {
                    ...selectedComp.state,
                    memory: words.map(word => [...word.toUpperCase()].reverse()),
                  },
                });
                setRomError('');
              }}
              rows={Math.min(8, 2 ** (selectedComp.inputs ?? 2))}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200 focus:outline-none focus:border-slate-500"
              aria-describedby={romError ? 'rom-memory-error' : undefined}
            />
            {romError && (
              <p id="rom-memory-error" role="alert" className="mt-1 text-[10px] text-red-400">
                {romError}
              </p>
            )}
            <p className="mt-1 text-[10px] text-slate-500">
              Uma palavra por endereço, começando no 0. Saia do campo para aplicar.
            </p>
          </div>
        )}

        {/* Direction */}
        <div>
          <label className="text-slate-400 font-medium mb-1 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <span>Orientação (Facing)</span>
          </label>
          <select
            value={selectedComp.direction || 'EAST'}
            onChange={(e) => updateComponent(selectedComp.id, { direction: e.target.value as Direction })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-slate-500"
          >
            <option value="EAST">Leste (Padrão)</option>
            <option value="SOUTH">Sul</option>
            <option value="WEST">Oeste</option>
            <option value="NORTH">Norte</option>
          </select>
        </div>

        <button
          onClick={() => updateComponent(selectedComp.id, { direction: rotateDirection(selectedComp.direction) })}
          className="w-full flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-300 hover:text-white hover:border-slate-600 transition"
          title="Girar componente 90° no sentido horário (R)"
        >
          <RotateCw className="w-4 h-4" />
          <span>Girar 90° ({selectedComp.direction || 'EAST'})</span>
        </button>

        {/* Coordinates */}
        <div className="pt-2 border-t border-slate-800 text-slate-500 flex justify-between font-mono text-[11px]">
          <span>Posição X: {selectedComp.x}</span>
          <span>Posição Y: {selectedComp.y}</span>
        </div>
      </div>
    </aside>
  );
};
