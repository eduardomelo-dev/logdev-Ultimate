import React, { useEffect, useState } from 'react';
import { X, RefreshCw, Binary } from 'lucide-react';
import { analyzeCombinationalCircuit, LogicAnalysisError, LogicAnalysisResult } from '../engine/logicAnalysis';
import { useCircuitStore } from '../store/circuitStore';
import { SignalChronogram } from './SignalChronogram';
import { TestVectorPanel } from './TestVectorPanel';

type AnalyzerTab = 'logic' | 'chronogram' | 'vectors';

interface LogicAnalyzerProps {
  onClose: () => void;
}

export const LogicAnalyzer: React.FC<LogicAnalyzerProps> = ({ onClose }) => {
  const { components, wires } = useCircuitStore();
  const [result, setResult] = useState<LogicAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<AnalyzerTab>('logic');

  const runAnalysis = () => {
    try {
      setResult(analyzeCombinationalCircuit({ components, wires }));
      setError('');
    } catch (cause) {
      setResult(null);
      setError(cause instanceof LogicAnalysisError || cause instanceof Error
        ? cause.message
        : 'Erro inesperado ao analisar o circuito.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="logic-analyzer-title"
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <Binary className="h-5 w-5 text-sky-400" />
            <div>
              <h2 id="logic-analyzer-title" className="text-sm font-semibold text-slate-100">
                Análise e verificação de circuitos
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Tabelas-verdade, monitoramento temporal e validação por vetores.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'logic' && (
              <button
                onClick={runAnalysis}
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Analisar circuito
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Fechar análise lógica"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <nav role="tablist" aria-label="Ferramentas de análise" className="flex shrink-0 gap-1 border-b border-slate-800 px-5 pt-2">
          {([
            ['logic', 'Tabela-verdade'],
            ['chronogram', 'Cronograma'],
            ['vectors', 'Vetores de teste'],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              id={`analysis-tab-${tab}`}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls="analysis-panel"
              className={`border-b-2 px-3 py-2 text-xs transition ${
                activeTab === tab
                  ? 'border-sky-400 text-sky-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div
          id="analysis-panel"
          role="tabpanel"
          aria-labelledby={`analysis-tab-${activeTab}`}
          className="min-h-0 overflow-y-auto p-5"
        >
          {activeTab === 'logic' && (
            <>
          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-amber-900/70 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
              {error}
            </div>
          )}

          {!result && !error && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-8 text-center">
              <p className="text-sm text-slate-300">Analise o circuito combinacional atual.</p>
              <p className="mt-2 text-xs text-slate-500">
                Suporta até 8 entradas de 1 bit; mapas de Karnaugh são exibidos até 4 entradas.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Funções booleanas
                </h3>
                <div className="space-y-2">
                  {result.outputs.map(output => (
                    <div key={output.id} className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
                      <div className="text-xs text-slate-400">{output.name}</div>
                      <div className="mt-1 break-words font-mono text-sm text-emerald-300">
                        {output.name} = {output.expression}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Variáveis: {result.inputs.map(input => `${input.variable} = ${input.name}`).join(' · ')}
                </p>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tabela-verdade ({result.rows.length} combinações)
                </h3>
                <div className="max-h-80 overflow-auto rounded-lg border border-slate-800">
                  <table className="w-full border-collapse text-center font-mono text-xs">
                    <thead className="sticky top-0 bg-slate-800 text-slate-300">
                      <tr>
                        {result.inputs.map(input => (
                          <th key={input.id} className="px-3 py-2 font-semibold">{input.variable}</th>
                        ))}
                        {result.outputs.map(output => (
                          <th key={output.id} className="border-l border-slate-700 px-3 py-2 font-semibold">
                            {output.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t border-slate-800 text-slate-300 even:bg-slate-800/30">
                          {row.inputs.map((value, index) => (
                            <td key={result.inputs[index].id} className="px-3 py-1.5">{Number(value)}</td>
                          ))}
                          {row.outputs.map((value, index) => (
                            <td key={result.outputs[index].id} className="border-l border-slate-800 px-3 py-1.5 text-emerald-300">
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {result.outputs.some(output => output.karnaughMap) && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Mapas de Karnaugh
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {result.outputs.map(output => {
                      const map = output.karnaughMap;
                      if (!map) return null;
                      return (
                        <div key={output.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                          <div className="mb-2 text-xs font-medium text-slate-300">{output.name}</div>
                          <div className="overflow-x-auto">
                            <table className="mx-auto border-collapse text-center font-mono text-xs">
                              <thead>
                                <tr>
                                  <th className="px-2 py-1 text-slate-500">
                                    {map.rowVariables.join('')}
                                    {map.columnVariables.length > 0 && ` \\ ${map.columnVariables.join('')}`}
                                  </th>
                                  {map.columnLabels.map(label => (
                                    <th key={label} className="px-3 py-1 text-slate-400">{label || '—'}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {map.values.map((row, rowIndex) => (
                                  <tr key={map.rowLabels[rowIndex]}>
                                    <th className="px-3 py-2 text-slate-400">{map.rowLabels[rowIndex] || '—'}</th>
                                    {row.map((value, columnIndex) => (
                                      <td
                                        key={`${rowIndex}-${columnIndex}`}
                                        className="border border-slate-700 px-4 py-2 font-semibold text-emerald-300"
                                      >
                                        {value}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {result.outputs.some(output => !output.karnaughMap) && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Mapas ocultos para funções com mais de 4 entradas; tabela e expressões continuam disponíveis.
                    </p>
                  )}
                </section>
              )}
            </div>
          )}
            </>
          )}
          {activeTab === 'chronogram' && <SignalChronogram />}
          {activeTab === 'vectors' && <TestVectorPanel />}
        </div>
      </section>
    </div>
  );
};
