// R1/Preferenze: preferenze utente persistite lato client (localStorage).
// MVP: nessuna infra server (user_preferences Supabase = futuro). Le prefs qui
// sono client-only; l'unica oggi "wired" nel comportamento è defaultRestSeconds
// (letta da liveStore come fallback prima della costante DEFAULT_REST_SECONDS).

import { DEFAULT_REST_SECONDS } from './config';

export type Unit = 'kg' | 'lbs';
export type Lang = 'it';

export interface Prefs {
  defaultRestSeconds: number;   // fallback recupero (FIX5)
  unit: Unit;                   // display-only per ora
  lang: Lang;                   // display-only per ora (i18n futuro)
}

export const DEFAULT_PREFS: Prefs = {
  defaultRestSeconds: DEFAULT_REST_SECONDS,
  unit: 'kg',
  lang: 'it',
};

const KEY = 'gt-prefs';

export function getPrefs(): Prefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    // merge difensivo: chiavi mancanti/invalide ricadono sui default.
    const rest = Number(parsed.defaultRestSeconds);
    return {
      defaultRestSeconds: Number.isFinite(rest) && rest > 0 ? Math.round(rest) : DEFAULT_PREFS.defaultRestSeconds,
      unit: parsed.unit === 'lbs' ? 'lbs' : 'kg',
      lang: 'it',
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setPrefs(next: Partial<Prefs>): Prefs {
  const merged = { ...getPrefs(), ...next };
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(KEY, JSON.stringify(merged)); } catch { /* storage pieno/negato — ignora */ }
  }
  return merged;
}
