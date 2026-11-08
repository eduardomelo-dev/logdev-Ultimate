import { useEffect, useRef, useState } from 'react';
import { useCircuitStore } from '../store/circuitStore';
import { AUTOSAVE_STORAGE_KEY, parseCircuitData, serializeCircuitData } from '../utils/circuitPersistence';

export type PersistenceStatus = 'loading' | 'saved' | 'saving' | 'recovered' | 'error';

export function useCircuitPersistence(): PersistenceStatus {
  const components = useCircuitStore(state => state.components);
  const wires = useCircuitStore(state => state.wires);
  const navigationStack = useCircuitStore(state => state.navigationStack);
  const projectComponents = navigationStack[0]?.parentComponents ?? components;
  const projectWires = navigationStack[0]?.parentWires ?? wires;
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<PersistenceStatus>('loading');
  const savedSnapshot = useRef<string | null>(null);
  const pendingSince = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (saved) {
        const circuit = parseCircuitData(JSON.parse(saved) as unknown);
        savedSnapshot.current = JSON.stringify(circuit);
        useCircuitStore.getState().loadCircuit(circuit);
        setStatus('recovered');
      } else {
        const current = useCircuitStore.getState();
        const project = current.getProjectCircuit();
        savedSnapshot.current = JSON.stringify(project);
        setStatus('saved');
      }
    } catch (error) {
      console.error('Não foi possível recuperar o autosave do circuito.', error);
      const current = useCircuitStore.getState();
      savedSnapshot.current = JSON.stringify(current.getProjectCircuit());
      setStatus('error');
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const snapshot = JSON.stringify({ components: projectComponents, wires: projectWires });
    if (snapshot === savedSnapshot.current) return;
    if (pendingSince.current === null) pendingSince.current = Date.now();

    const save = () => {
      pendingSince.current = null;
      const latest = useCircuitStore.getState();
      const project = latest.getProjectCircuit();
      const latestSnapshot = JSON.stringify(project);
      try {
        window.localStorage.setItem(
          AUTOSAVE_STORAGE_KEY,
          serializeCircuitData(project)
        );
        savedSnapshot.current = latestSnapshot;
        setStatus('saved');
      } catch (error) {
        console.error('Não foi possível salvar automaticamente o circuito.', error);
        setStatus('error');
      }
    };

    setStatus('saving');
    const elapsed = Date.now() - pendingSince.current;
    const delay = Math.max(0, 900 - elapsed);
    const timeout = window.setTimeout(() => {
      save();
    }, delay);
    const saveLatestOnClose = () => {
      const latest = useCircuitStore.getState();
      try {
        window.localStorage.setItem(
          AUTOSAVE_STORAGE_KEY,
          serializeCircuitData(latest.getProjectCircuit())
        );
      } catch (error) {
        console.error('Não foi possível salvar o circuito ao fechar o aplicativo.', error);
      }
    };
    window.addEventListener('pagehide', saveLatestOnClose);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('pagehide', saveLatestOnClose);
    };
  }, [hydrated, projectComponents, projectWires]);

  return status;
}
