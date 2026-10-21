-- Q1-infra: schema change per abilitare analytics progressioni (Q1) e
-- per il POST di F6 (Summary screen Live).
--
-- Decisione architetturale (SPEC FIX5_Q1infra_F6 del 2026-05-28):
-- Opzione B — campo JSONB exercise_results su workouts, NON schema
-- relazionale workout_exercises + workout_sets.
--
-- Nessun backfill dei record storici: i workout esistenti avranno
-- exercise_results = null. Analytics Q1 partono dai workout salvati
-- dopo questa migration.
--
-- Tutte le ALTER sono nullable + IF NOT EXISTS per idempotenza.

-- ─── workouts: campo JSONB per i risultati per-esercizio ───
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS exercise_results JSONB;

-- ─── exercises: tabella canonica con UUID stabile ───
-- Permette confronti cross-scheda: lo stesso movimento (es. "Panca
-- piana") ha un id stabile anche se compare in più schede. Le schede
-- esistenti restano con stringhe libere (no matching automatico per
-- nome — rischio typo/case-inconsistency). Da deploy in poi, le nuove
-- voci di scheda referenziano exercises.id via esercizi.exercise_id.
CREATE TABLE IF NOT EXISTS exercises (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user owns exercises" ON exercises;
CREATE POLICY "user owns exercises"
  ON exercises FOR ALL
  USING (auth.uid() = user_id);

-- ─── esercizi (riga di scheda): FK opzionale verso exercises + rest_seconds ───
-- Nota: nello SPEC la tabella si chiama 'scheda_esercizi'; nel nostro
-- schema reale (vedi 20260429000000_live_mode.sql) la tabella è
-- 'esercizi' — child di 'tipi' che è child di 'schede'. Lo SPEC §1.4
-- prevede esplicitamente di adattare ai nomi reali.
ALTER TABLE esercizi
  ADD COLUMN IF NOT EXISTS exercise_id  UUID REFERENCES exercises(id),
  ADD COLUMN IF NOT EXISTS rest_seconds INTEGER;
-- rest_seconds NULL = usa il default utente (per ora costante
-- DEFAULT_REST_SECONDS = 90 lato client, futuro user_preferences).
