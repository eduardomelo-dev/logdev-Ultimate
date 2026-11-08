import React, { useEffect } from 'react';
import { CircuitCanvas } from './canvas/CircuitCanvas';
import { Header } from './components/Header';
import { Inspector } from './components/Inspector';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { useCircuitPersistence } from './hooks/useCircuitPersistence';
import { useCircuitStore } from './store/circuitStore';

export const App: React.FC = () => {
  const persistenceStatus = useCircuitPersistence();
  const { isSimulating, clockFrequency, stepSimulation } = useCircuitStore();

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
      <Header />
      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 min-h-0 min-w-0 h-full relative">
          <CircuitCanvas />
        </main>
        <Inspector />
      </div>
      <StatusBar persistenceStatus={persistenceStatus} />
    </div>
  );
};

export default App;
