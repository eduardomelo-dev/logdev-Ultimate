import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useCircuitStore } from '../../store/circuitStore';
import { AUTOSAVE_STORAGE_KEY } from '../../utils/circuitPersistence';
import { useCircuitPersistence } from '../useCircuitPersistence';

afterEach(() => {
  window.localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
  useCircuitStore.getState().resetCircuit();
});

describe('Circuit autosave hook', () => {
  it('saves edits and restores the last circuit on the next mount', async () => {
    const firstMount = renderHook(() => useCircuitPersistence());
    await waitFor(() => expect(firstMount.result.current).not.toBe('loading'));

    act(() => {
      useCircuitStore.getState().addComponent('PIN_INPUT', 40, 60);
    });
    await waitFor(() => {
      const saved = window.localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      expect(saved).not.toBeNull();
      expect(JSON.parse(saved!).circuit.components).toHaveLength(1);
    }, { timeout: 2000 });
    firstMount.unmount();

    useCircuitStore.getState().resetCircuit();
    const recoveredMount = renderHook(() => useCircuitPersistence());
    await waitFor(() => {
      expect(useCircuitStore.getState().components).toHaveLength(1);
    });
    expect(useCircuitStore.getState().components[0]).toMatchObject({
      type: 'PIN_INPUT',
      x: 40,
      y: 60,
    });
    recoveredMount.unmount();
  });
});
