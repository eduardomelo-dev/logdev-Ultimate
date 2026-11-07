import React, { useRef } from 'react';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Hand,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Download,
  Upload,
  Cpu,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useCircuitStore } from '../store/circuitStore';

export const Header: React.FC = () => {
  const {
    tool,
    setTool,
    isSimulating,
    setRunning,
    stepSimulation,
    clockFrequency,
    setClockFrequency,
    zoom,
    setZoom,
    setPan,
    resetCircuit,
    undo,
    redo,
    historyIndex,
    history,
    components,
    wires,
    loadCircuit,
  } = useCircuitStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    const data = JSON.stringify({ components, wires }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuito_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.components && parsed.wires) {
          loadCircuit(parsed);
        }
      } catch (err) {
        alert('Erro ao carregar arquivo de circuito.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-20 shadow-md">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-950/40">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-wide bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Logisim Studio
          </span>
          <span className="text-[10px] text-slate-400 block -mt-0.5 tracking-wider uppercase font-semibold">
            Digital Logic CAD
          </span>
        </div>
      </div>

      {/* Main Interactive Toolbar */}
      <div className="flex items-center gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
        {/* Tool selector */}
        <button
          onClick={() => setTool('poke')}
          title="Ferramenta Poke (Mãozinha): clique em chaves e pinos para interagir"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            tool === 'poke'
              ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Hand className="w-4 h-4" />
          <span>Interagir</span>
        </button>

        <button
          onClick={() => setTool('select')}
          title="Ferramenta Seleção / Edição"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            tool === 'select'
              ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <MousePointer className="w-4 h-4" />
          <span>Editar</span>
        </button>

        <div className="w-px h-5 bg-slate-800 mx-1" />

        {/* Simulation Controls */}
        <button
          onClick={() => setRunning(!isSimulating)}
          title={isSimulating ? 'Pausar Simulação' : 'Iniciar Simulação Contínua'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            isSimulating
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/40'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isSimulating ? 'Rodando' : 'Pausado'}</span>
        </button>

        <button
          onClick={stepSimulation}
          title="Avançar 1 Tick de Simulação"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
        >
          <StepForward className="w-4 h-4" />
        </button>

        {/* Frequency selector */}
        <div className="flex items-center gap-1 text-xs text-slate-400 pl-1">
          <span>Clock:</span>
          <select
            value={clockFrequency}
            onChange={(e) => setClockFrequency(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value={1}>1 Hz</option>
            <option value={2}>2 Hz</option>
            <option value={5}>5 Hz</option>
            <option value={10}>10 Hz</option>
            <option value={20}>20 Hz</option>
          </select>
        </div>

        <div className="w-px h-5 bg-slate-800 mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          title="Desfazer (Ctrl+Z)"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          title="Refazer (Ctrl+Y)"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Zoom */}
        <div className="flex items-center bg-slate-950/60 rounded-lg border border-slate-800 px-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z * 0.85))}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition"
            title="Reduzir Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-300 w-11 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z * 1.15))}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition ml-1"
            title="Centralizar e Resetar Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* File Actions */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImport}
          accept=".json"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Importar Arquivo JSON"
          className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition text-xs flex items-center gap-1.5 border border-slate-700"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden md:inline">Importar</span>
        </button>

        <button
          onClick={handleExport}
          title="Exportar Circuito (JSON)"
          className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition text-xs flex items-center gap-1.5 border border-slate-700"
        >
          <Download className="w-4 h-4" />
          <span className="hidden md:inline">Exportar</span>
        </button>

        <button
          onClick={resetCircuit}
          title="Limpar Área de Trabalho"
          className="p-2 text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-900/40 rounded-lg transition text-xs flex items-center gap-1.5 border border-red-900/50"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden md:inline">Limpar</span>
        </button>
      </div>
    </header>
  );
};
