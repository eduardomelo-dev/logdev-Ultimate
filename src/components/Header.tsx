import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  StepForward,
  Hand,
  MousePointer,
  Trash2,
  Download,
  Upload,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Code2,
} from 'lucide-react';
import { useCircuitStore } from '../store/circuitStore';
import { LogdevLogo } from './LogdevLogo';
import { parseCircuitData } from '../utils/circuitPersistence';

export const Header: React.FC = () => {
  const {
    tool,
    setTool,
    isSimulating,
    setRunning,
    stepSimulation,
    clockFrequency,
    setClockFrequency,
    resetCircuit,
    components,
    wires,
    loadCircuit,
    simulator,
  } = useCircuitStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportJson = () => {
    const data = JSON.stringify({ components, wires }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logdev_circuito_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportPdf = async () => {
    try {
      const { exportToPdf } = await import('../utils/exportUtils');
      await exportToPdf(
        components,
        wires,
        (compId, portId) => simulator.getPinValue(compId, portId),
        (compId, portId) => simulator.getNetValue(compId, portId),
        `logdev_circuito_${Date.now()}.pdf`
      );
      setShowExportMenu(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado.';
      alert(`Não foi possível exportar o PDF: ${message}`);
    }
  };

  const handleExportJpeg = async () => {
    try {
      const { exportToJpeg } = await import('../utils/exportUtils');
      exportToJpeg(
        components,
        wires,
        (compId, portId) => simulator.getPinValue(compId, portId),
        (compId, portId) => simulator.getNetValue(compId, portId),
        `logdev_circuito_${Date.now()}.jpg`
      );
      setShowExportMenu(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado.';
      alert(`Não foi possível exportar o JPEG: ${message}`);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseCircuitData(JSON.parse(String(event.target?.result)));
        loadCircuit(parsed);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado.';
        alert(`Não foi possível carregar o circuito: ${message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-20 shadow-sm">
      {/* Brand & System Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-emerald-500 p-0.5 shadow-md shadow-cyan-950/30 flex items-center justify-center">
          <LogdevLogo size={9} className="w-full h-full rounded-[10px] object-contain drop-shadow" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
              logdev
            </span>
            <span className="text-[10px] bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
              Ultimate
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block -mt-0.5 tracking-wider uppercase font-semibold">
            Digital Logic CAD & Simulator
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
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Hand className="w-4 h-4" />
          <span>Interagir</span>
        </button>

        <button
          onClick={() => setTool('select')}
          title="Ferramenta de seleção. Arraste no canvas para selecionar vários elementos."
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            tool === 'select'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <MousePointer className="w-4 h-4" />
          <span>Selecionar</span>
        </button>

        <div className="w-px h-5 bg-slate-800 mx-1" />

        {/* Simulation Controls */}
        <button
          onClick={() => setRunning(!isSimulating)}
          title={isSimulating ? 'Pausar Simulação' : 'Iniciar Simulação Contínua'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            isSimulating
              ? 'bg-slate-700 text-slate-100'
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
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-slate-500"
          >
            <option value={1}>1 Hz</option>
            <option value={2}>2 Hz</option>
            <option value={5}>5 Hz</option>
            <option value={10}>10 Hz</option>
            <option value={20}>20 Hz</option>
          </select>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Import */}
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
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition text-xs flex items-center gap-1.5 border border-slate-700"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden md:inline">Importar</span>
          </button>

          {/* Export Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowExportMenu(!showExportMenu);
              }}
              title="Exportar Circuito (PDF, JPEG, JSON)"
              className="p-2 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition text-xs flex items-center gap-1.5 border border-slate-700"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span className="hidden md:inline">Exportar</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-11 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 space-y-1 z-50">
                <div className="text-[10px] uppercase font-semibold text-slate-500 px-2 py-1">
                  Opções de Exportação
                </div>
                <button
                  onClick={handleExportPdf}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="font-medium">Exportar PDF</div>
                    <div className="text-[10px] text-slate-400">Diagrama em folha A4</div>
                  </div>
                </button>
                <button
                  onClick={handleExportJpeg}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                >
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="font-medium">Exportar JPEG</div>
                    <div className="text-[10px] text-slate-400">Imagem de alta definição</div>
                  </div>
                </button>
                <button
                  onClick={handleExportJson}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                >
                  <Code2 className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="font-medium">Exportar JSON</div>
                    <div className="text-[10px] text-slate-400">Arquivo de projeto nativo</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Clear Canvas */}
          <button
            onClick={resetCircuit}
            title="Limpar Área de Trabalho"
            className="p-2 text-slate-400 hover:text-red-300 bg-slate-800 hover:bg-red-950/30 rounded-lg transition text-xs flex items-center gap-1.5 border border-slate-700 hover:border-red-900/50"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden md:inline">Limpar</span>
          </button>
        </div>
      </div>
    </header>
  );
};