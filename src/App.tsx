import React, { useEffect, useState } from 'react';
import { CircuitCanvas } from './canvas/CircuitCanvas';
import { Header } from './components/Header';
import { Inspector } from './components/Inspector';
import { LogicAnalyzer } from './components/LogicAnalyzer';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { useCircuitPersistence } from './hooks/useCircuitPersistence';
import { useCircuitStore } from './store/circuitStore';

export const App: React.FC = () => {
  const [isLogicAnalyzerOpen, setLogicAnalyzerOpen] = useState(false);
  const persistenceStatus = useCircuitPersistence();
  const {
    isSimulating,
    clockFrequency,
    stepSimulation,
    navigationStack,
    exitSubcircuit,
  } = useCircuitStore();

  const navigateToDepth = (depth: number) => {
    for (let currentDepth = navigationStack.length; currentDepth > depth; currentDepth--) {
      exitSubcircuit();
    }
  };

  // Clock ticker effect
  useEffect(() => {
    if (!isSimulating) return;
    const intervalMs = 1000 / clockFrequency;
    const interval = setInterval(() => {
      stepSimulation();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [isSimulating, clockFrequency, stepSimulation]);

  return (
    <div className="flex flex-col w-screen h-screen min-w-0 overflow-hidden bg-slate-950 font-sans">
      <Header onOpenLogicAnalyzer={() => setLogicAnalyzerOpen(true)} />
      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 min-h-0 min-w-0 h-full relative">
          <CircuitCanvas />
          {navigationStack.length > 0 && (
            <nav
              aria-label="Navegação de subcircuitos"
              className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-1 overflow-x-auto rounded-md border border-slate-700 bg-slate-950/95 px-2 py-1.5 text-xs shadow-lg"
            >
              <button
                type="button"
                onClick={() => navigateToDepth(0)}
                className="shrink-0 text-slate-300 hover:text-white"
              >
                Circuito principal
              </button>
              {navigationStack.map((frame, index) => (
                <React.Fragment key={`${frame.subcircuitId}-${index}`}>
                  <span className="text-slate-600">/</span>
                  {index === navigationStack.length - 1 ? (
                    <span className="truncate font-medium text-sky-300">{frame.name}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigateToDepth(index + 1)}
                      className="shrink-0 text-slate-300 hover:text-white"
                    >
                      {frame.name}
                    </button>
                  )}
                </React.Fragment>
              ))}
              <button
                type="button"
                onClick={exitSubcircuit}
                className="ml-1 shrink-0 rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Voltar ao circuito pai"
              >
                Voltar
              </button>
            </nav>
          )}
        </main>
        <Inspector />
      </div>
      <StatusBar persistenceStatus={persistenceStatus} />
      {isLogicAnalyzerOpen && (
        <LogicAnalyzer onClose={() => setLogicAnalyzerOpen(false)} />
      )}
    </div>
  );
};

export default App;
