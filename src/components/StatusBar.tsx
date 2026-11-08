import React from 'react';
import { Activity, AlertTriangle, Grid, Layers, Save, Terminal } from 'lucide-react';
import { COMPONENT_METADATA } from '../engine/components';
import { useCircuitStore } from '../store/circuitStore';
import { PersistenceStatus } from '../hooks/useCircuitPersistence';

interface StatusBarProps {
  persistenceStatus: PersistenceStatus;
}

export const StatusBar: React.FC<StatusBarProps> = ({ persistenceStatus }) => {
  const { isSimulating, tool, ticks, zoom, simulator, pendingComponentType } = useCircuitStore();
  const diagnostics = simulator.getDiagnostics();

  return (
    <footer className="h-7 bg-slate-950 border-t border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-400 select-none z-20">
      <div className="flex items-center gap-4">
        {/* Simulation state */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isSimulating ? 'bg-slate-400' : 'bg-slate-600'
            }`}
          />
          <span className="font-medium text-slate-300">
            {isSimulating ? 'Simulação Ativa' : 'Simulação Pausada'}
          </span>
        </div>

        <div className="w-px h-3.5 bg-slate-800" />

        {/* Ticks */}
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-slate-500" />
          <span>Ticks:</span>
          <span className="font-mono text-slate-200 font-semibold">{ticks}</span>
        </div>

        <div className="w-px h-3.5 bg-slate-800" />

        {/* Active Tool */}
        <div className="flex items-center gap-1">
          <span>Modo:</span>
          <span className="text-slate-300 font-medium uppercase tracking-wider text-[10px]">
            {tool === 'poke' ? 'Poke (Interativo)' : 'Selecionar / Conectar'}
          </span>
        </div>

        <div className="flex items-center gap-1" title={diagnostics.map(item => item.message).join('\n')}>
          <AlertTriangle className={`w-3 h-3 ${diagnostics.length ? 'text-amber-400' : 'text-slate-600'}`} />
          <span>{diagnostics.length ? `${diagnostics.length} aviso(s)` : 'Sem erros'}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1" role="status" aria-live="polite">
          <Save className={`w-3 h-3 ${persistenceStatus === 'error' ? 'text-red-400' : 'text-slate-500'}`} />
          <span>
            {persistenceStatus === 'loading' ? 'Recuperando...'
              : persistenceStatus === 'saving' ? 'Salvando...'
              : persistenceStatus === 'recovered' ? 'Projeto recuperado'
              : persistenceStatus === 'error' ? 'Falha no autosave'
              : 'Salvo localmente'}
          </span>
        </div>

        {/* Help Tip */}
        <div className="hidden sm:flex items-center gap-1.5 text-slate-500">
          <Terminal className="w-3 h-3" />
          <span>
            {pendingComponentType
              ? `Posicionando ${COMPONENT_METADATA[pendingComponentType].name}: clique para colocar · Esc cancela`
              : 'Arraste no vazio para selecionar · botão direito: ações'}
          </span>
        </div>

        <div className="w-px h-3.5 bg-slate-800" />

        {/* Grid & Zoom info */}
        <div className="flex items-center gap-1">
          <Grid className="w-3 h-3 text-slate-500" />
          <span>Grade: 20px</span>
        </div>

        <div className="flex items-center gap-1">
          <Layers className="w-3 h-3 text-slate-500" />
          <span>Escala: {Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </footer>
  );
};
