import { useState, useCallback } from 'react';
import type { EditState } from '../types';
import { DEFAULT_EDIT_STATE } from '../types';

/**
 * Undo/Redo history stack for the photo editor.
 * Stores past states for undo and future states for redo.
 */
export function useEditHistory(initialUri: string) {
  const [past, setPast] = useState<EditState[]>([]);
  const [present, setPresent] = useState<EditState>(DEFAULT_EDIT_STATE(initialUri));
  const [future, setFuture] = useState<EditState[]>([]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const pushState = useCallback((newState: EditState) => {
    setPast(prev => {
      const updated = [...prev, present];
      // Cap history at 20 entries to prevent memory buildup
      return updated.length > 20 ? updated.slice(-20) : updated;
    });
    setPresent(newState);
    setFuture([]); // Clear redo stack on new action
  }, [present]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(prev => prev.slice(0, -1));
    setFuture(prev => [present, ...prev]);
    setPresent(previous);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(prev => prev.slice(1));
    setPast(prev => [...prev, present]);
    setPresent(next);
  }, [future, present]);

  const reset = useCallback(() => {
    setPast([]);
    setFuture([]);
    setPresent(DEFAULT_EDIT_STATE(initialUri));
  }, [initialUri]);

  return {
    state: present,
    canUndo,
    canRedo,
    pushState,
    undo,
    redo,
    reset,
  };
}
