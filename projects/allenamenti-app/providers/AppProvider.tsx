'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

const ACTIVE_SCHEDA_KEY = 'gt-active-scheda-id';

export interface Esercizio {
  id: string;
  titolo: string;
  ripetizioni: string;
  carico: string;
  recupero: string;
  note: string;
  setsTarget?: number;
  exerciseId?: string;     // Q1-infra: FK opzionale verso exercises.id (canonical UUID per analytics cross-scheda)
  restSeconds?: number;    // Q1-infra: recupero in secondi (numerico). Se null, fallback parseRecuperoSeconds(recupero) o DEFAULT_REST_SECONDS.
  bloccoId?: string;       // FIX6: se set, l'esercizio appartiene a un blocco circuito (altrimenti è "singolo")
}

// FIX6: blocco circuito tra Tipo (giorno) ed Esercizio.
export type BloccoTipo = 'circuito_amrap' | 'circuito_giri' | 'singolo';

export interface Blocco {
  id: string;
  tipo: BloccoTipo;
  durataMinuti?: number;   // solo circuito_amrap
  giriTarget?: number;     // riservato circuito_giri (SPEC §7)
  notaComune?: string;
  esercizi: Esercizio[];
}

export interface Tipo {
  id: string;
  nome: string;
  esercizi: Esercizio[];   // FIX6: solo esercizi SINGOLI (fuori da blocchi)
  blocchi: Blocco[];       // FIX6: circuiti del giorno
}

// FIX6: tutti gli esercizi di un giorno (singoli + quelli dentro i blocchi),
// nell'ordine singoli → blocchi. Usato per conteggi e per la Live (Fase 1: la
// Live tratta ancora i circuiti come sequenza finché non arriva la pagina AMRAP).
export function tipoEsercizi(t: Tipo): Esercizio[] {
  return [...t.esercizi, ...t.blocchi.flatMap(b => b.esercizi)];
}

export interface Scheda {
  id: string;
  nome: string;
  mese: string;
  dataInizio?: string;
  weeks?: number;
  tipi: Tipo[];
}

export interface Workout {
  id: string;
  data: string;
  ora: string;
  scheda: string;
  tipo: string;
  durata: number;
  note: string;
  setsCompleted?: number;
  setsTotal?: number;
  exercisesCompleted?: number;
  exercisesTotal?: number;
  programmaWeek?: number;
  voiceNoteTranscript?: string;
  source?: 'manual' | 'live';
  exerciseResults?: import('@/lib/liveTypes').ExerciseResult[];  // Q1-infra: JSONB workouts.exercise_results
}

export interface WeightLog {
  id: string;
  date: string;
  esNome: string;
  carico: string;
  note: string;
}

interface AppContextValue {
  workouts: Workout[];
  schede: Scheda[];
  weightLogs: WeightLog[];
  authToken: string | null;
  setAuthToken: (t: string | null) => void;
  loadWorkouts: () => Promise<void>;
  loadSchede: () => Promise<void>;
  loadWeightLogs: () => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  toast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  toastState: { msg: string; type: string; visible: boolean };
  activeScheda: Scheda | null;
  setActiveSchedaId: (id: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [workouts,   setWorkouts]   = useState<Workout[]>([]);
  const [schede,     setSchede]     = useState<Scheda[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [authToken,  setAuthToken]  = useState<string | null>(null);
  const [toastState, setToastState] = useState({ msg: '', type: 'success', visible: false });
  const [activeSchedaId, setActiveSchedaIdState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(ACTIVE_SCHEDA_KEY);
    if (saved) setActiveSchedaIdState(saved);
  }, []);

  const setActiveSchedaId = useCallback((id: string | null) => {
    setActiveSchedaIdState(id);
    if (typeof window === 'undefined') return;
    if (id) window.localStorage.setItem(ACTIVE_SCHEDA_KEY, id);
    else window.localStorage.removeItem(ACTIVE_SCHEDA_KEY);
  }, []);

  const activeScheda = useMemo<Scheda | null>(() => {
    if (schede.length === 0) return null;
    if (activeSchedaId) {
      const found = schede.find(s => s.id === activeSchedaId);
      if (found) return found;
    }
    return schede[0];
  }, [activeSchedaId, schede]);

  const apiFetch = useCallback((url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
    if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
    return fetch(url, { ...options, headers });
  }, [authToken]);

  const loadWorkouts = useCallback(async () => {
    if (!authToken) return;
    const r = await apiFetch('/api/workouts');
    if (r.ok) setWorkouts(await r.json());
  }, [apiFetch, authToken]);

  const loadSchede = useCallback(async () => {
    if (!authToken) return;
    const r = await apiFetch('/api/schede');
    if (r.ok) setSchede(await r.json());
  }, [apiFetch, authToken]);

  const loadWeightLogs = useCallback(async () => {
    if (!authToken) return;
    const r = await apiFetch('/api/weight-logs');
    if (r.ok) setWeightLogs(await r.json());
  }, [apiFetch, authToken]);

  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  const toast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimer) clearTimeout(toastTimer);
    setToastState({ msg, type, visible: true });
    toastTimer = setTimeout(() => setToastState(s => ({ ...s, visible: false })), 4000);
  }, []);

  return (
    <AppContext.Provider value={{
      workouts, schede, weightLogs,
      authToken, setAuthToken,
      loadWorkouts, loadSchede, loadWeightLogs,
      apiFetch, toast, toastState,
      activeScheda, setActiveSchedaId,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
