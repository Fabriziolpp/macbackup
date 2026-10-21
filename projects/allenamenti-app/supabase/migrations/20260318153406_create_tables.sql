-- create_tables — ricavata il 2026-10-14 dallo storico remoto (supabase_migrations.schema_migrations).
-- Già applicata in produzione: è qui solo per allineare l'elenco locale a quello remoto.
CREATE TABLE workouts (
  id     TEXT PRIMARY KEY,
  data   DATE    NOT NULL,
  ora    TEXT    NOT NULL DEFAULT '',
  scheda TEXT    NOT NULL DEFAULT '',
  tipo   TEXT    NOT NULL DEFAULT '',
  durata INTEGER NOT NULL DEFAULT 0,
  note   TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE schede (
  id   TEXT PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT '',
  mese TEXT NOT NULL DEFAULT ''
);

CREATE TABLE tipi (
  id        TEXT    PRIMARY KEY,
  scheda_id TEXT    NOT NULL REFERENCES schede(id) ON DELETE CASCADE,
  nome      TEXT    NOT NULL DEFAULT '',
  ordine    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_tipi_scheda_id ON tipi(scheda_id);

CREATE TABLE esercizi (
  id          TEXT    PRIMARY KEY,
  tipo_id     TEXT    NOT NULL REFERENCES tipi(id) ON DELETE CASCADE,
  titolo      TEXT    NOT NULL DEFAULT '',
  ripetizioni TEXT    NOT NULL DEFAULT '',
  carico      TEXT    NOT NULL DEFAULT '',
  recupero    TEXT    NOT NULL DEFAULT '',
  note        TEXT    NOT NULL DEFAULT '',
  ordine      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_esercizi_tipo_id ON esercizi(tipo_id);

CREATE TABLE weight_logs (
  id      TEXT PRIMARY KEY,
  date    DATE NOT NULL,
  es_nome TEXT NOT NULL DEFAULT '',
  carico  TEXT NOT NULL DEFAULT '',
  note    TEXT NOT NULL DEFAULT ''
);
