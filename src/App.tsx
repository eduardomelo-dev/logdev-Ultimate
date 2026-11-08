import React, { useEffect, useState } from 'react';
import { CircuitCanvas } from './canvas/CircuitCanvas';
import { Header } from './components/Header';
import { Inspector } from './components/Inspector';
import { LogicAnalyzer } from './components/LogicAnalyzer';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { ToolRail } from './components/ToolRail';
import { FirstRunTutorial, FIRST_RUN_TUTORIAL_KEY } from './components/FirstRunTutorial';
import { useCircuitPersistence } from './hooks/useCircuitPersistence';
import { useCircuitStore } from './store/circuitStore';

export const App: React.FC = () => {
  const [isLogicAnalyzerOpen, setLogicAnalyzerOpen] = useState(false);
  const [isFirstRunTutorialOpen, setFirstRunTutorialOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return window.localStorage.getItem('logdev-theme') === 'dark' ? 'dark' : 'light';
    } catch (error) {
      console.error('Não foi possível carregar a preferência de tema.', error);
      return 'light';
    }
  });
  const persistenceStatus = useCircuitPersistence();
  const {
    isSimulating,
    clockFrequency,
    stepSimulation,
    navigationStack,
    exitSubcircuit,
  } = useCircuitStore();

  useEffect(() => {
    try {
      setFirstRunTutorialOpen(window.localStorage.getItem(FIRST_RUN_TUTORIAL_KEY) !== 'completed');
    } catch (error) {
      console.error('Não foi possível verificar se o tutorial inicial já foi exibido.', error);
      setFirstRunTutorialOpen(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('logdev-theme', theme);
    } catch (error) {
      console.error('Não foi possível salvar a preferência de tema.', error);
    }
  }, [theme]);

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
    <div className={`nexus-shell theme-${theme} flex flex-col w-screen h-screen min-w-0 overflow-hidden bg-slate-950 font-sans`}>
      <Header
        theme={theme}
        onToggleTheme={() => setTheme(current => current === 'light' ? 'dark' : 'light')}
        onOpenLogicAnalyzer={() => setLogicAnalyzerOpen(true)}
      />
      <div className="nexus-workspace flex-1 min-h-0 min-w-0 flex overflow-hidden relative">
        <Sidebar />
        <main className="canvas-workspace flex-1 min-h-0 min-w-0 h-full relative">
          <CircuitCanvas theme={theme} />
          <ToolRail />
          {navigationStack.length > 0 && (
            <nav
              aria-label="Navegação de subcircuitos"
              className="nexus-breadcrumb absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-1 overflow-x-auto rounded-md border border-slate-700 bg-slate-950/95 px-2 py-1.5 text-xs shadow-lg"
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
      {isFirstRunTutorialOpen && (
        <FirstRunTutorial onDismiss={() => setFirstRunTutorialOpen(false)} />
      )}
    </div>
  );
};

export default App;
