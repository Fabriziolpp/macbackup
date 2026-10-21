-- Live mode foundations
-- Aggiunge i campi necessari per "Allenamento Live":
--   * schede: programma temporale (data inizio, settimane)
--   * esercizi: numero serie target
--   * workouts: metadati sessione live (serie / esercizi completati,
--     settimana del programma, trascrizione vocale, origine)
--
-- Tutte le colonne sono NULLABLE per backward compatibility con i record
-- esistenti e con i POST che non includono i nuovi campi.

-- ─── Schede: programma temporale ───
ALTER TABLE schede
  ADD COLUMN IF NOT EXISTS data_inizio DATE,
  ADD COLUMN IF NOT EXISTS weeks       SMALLINT;

-- ─── Esercizi: serie target ───
ALTER TABLE esercizi
  ADD COLUMN IF NOT EXISTS sets_target SMALLINT;

-- ─── Workouts: metadati sessione live ───
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS sets_completed        SMALLINT,
  ADD COLUMN IF NOT EXISTS sets_total            SMALLINT,
  ADD COLUMN IF NOT EXISTS exercises_completed   SMALLINT,
  ADD COLUMN IF NOT EXISTS exercises_total       SMALLINT,
  ADD COLUMN IF NOT EXISTS programma_week        SMALLINT,
  ADD COLUMN IF NOT EXISTS voice_note_transcript TEXT,
  ADD COLUMN IF NOT EXISTS source                TEXT DEFAULT 'manual';

-- I record esistenti hanno source = NULL dopo l'ALTER (DEFAULT vale solo
-- per le nuove insert). Backfill esplicito a 'manual'.
UPDATE workouts SET source = 'manual' WHERE source IS NULL;
