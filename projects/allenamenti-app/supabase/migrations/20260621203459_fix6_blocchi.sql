-- FIX6: entità Blocco (circuito) intermedia tra Tipo (giorno) ed Esercizio.
--
-- Modella un gruppo di esercizi eseguiti in circuito (AMRAP a giri liberi entro
-- un tempo, o a giri fissi). Decisione storage (SPEC_FIX6 §2): tabella relazionale
-- coerente col modello schede→tipi→esercizi, NON JSON annidato.
--
-- esercizi.blocco_id è NULLABLE: null = esercizio "singolo" (comportamento
-- attuale invariato). Nessun backfill: i record esistenti restano singoli.
-- id TEXT come tipi/esercizi (app genera con newId, non UUID).

CREATE TABLE IF NOT EXISTS blocchi (
  id            TEXT PRIMARY KEY,
  tipo_id       TEXT NOT NULL REFERENCES tipi(id) ON DELETE CASCADE,
  ordine        INTEGER NOT NULL DEFAULT 0,
  -- 'circuito_amrap' = giri liberi entro durata_minuti; 'circuito_giri' = giri
  -- fissi (riservato, SPEC §6/§7, solo dati grezzi per ora); 'singolo' = blocco
  -- degenere a un esercizio (di norma non usato: i singoli restano blocco_id null).
  tipo          TEXT NOT NULL DEFAULT 'singolo'
                  CHECK (tipo IN ('circuito_amrap', 'circuito_giri', 'singolo')),
  durata_minuti INTEGER,        -- solo circuito_amrap
  giri_target   INTEGER,        -- riservato circuito_giri (SPEC §7), null per amrap
  nota_comune   TEXT,           -- nota tecnica comune al blocco
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE blocchi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user owns blocchi" ON blocchi;
CREATE POLICY "user owns blocchi"
  ON blocchi FOR ALL
  USING (auth.uid() = user_id);

-- FK opzionale esercizio → blocco. ON DELETE CASCADE: eliminare un blocco
-- elimina i suoi esercizi (coerente con il modello "il blocco possiede gli
-- esercizi del circuito").
ALTER TABLE esercizi
  ADD COLUMN IF NOT EXISTS blocco_id TEXT REFERENCES blocchi(id) ON DELETE CASCADE;
