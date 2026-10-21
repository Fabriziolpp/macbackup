/**
 * Script one-time: importa data.json in Supabase.
 * Eseguire con: node migrate-data.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const supabase = require('./supabaseClient');

const DATA_FILE = path.join(__dirname, 'data.json');

async function migrate() {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const { workouts = [], schede = [], weightLogs = [] } = raw;

  console.log(`[migrate] workouts: ${workouts.length}, schede: ${schede.length}, weightLogs: ${weightLogs.length}`);

  // ─── WORKOUTS ──────────────────────────────────────────────────────────────
  if (workouts.length) {
    const rows = workouts.map(w => ({
      id:     w.id,
      data:   w.data,
      ora:    w.ora    || '',
      scheda: w.scheda || '',
      tipo:   w.tipo   || '',
      durata: parseInt(w.durata, 10) || 0,
      note:   w.note   || ''
    }));
    const { error } = await supabase.from('workouts').insert(rows);
    if (error) throw new Error('workouts: ' + error.message);
    console.log(`[migrate] ✓ ${rows.length} workouts inseriti`);
  }

  // ─── SCHEDE → TIPI → ESERCIZI ─────────────────────────────────────────────
  for (const s of schede) {
    // scheda
    const { error: errS } = await supabase.from('schede').insert({
      id:   s.id,
      nome: s.nome || '',
      mese: s.mese || ''
    });
    if (errS) throw new Error(`scheda ${s.id}: ` + errS.message);

    // tipi
    for (let ti = 0; ti < (s.tipi || []).length; ti++) {
      const t = s.tipi[ti];
      const { error: errT } = await supabase.from('tipi').insert({
        id:        t.id,
        scheda_id: s.id,
        nome:      t.nome || '',
        ordine:    ti
      });
      if (errT) throw new Error(`tipo ${t.id}: ` + errT.message);

      // esercizi
      const esRows = (t.esercizi || []).map((e, ei) => ({
        id:          e.id,
        tipo_id:     t.id,
        titolo:      e.titolo      || '',
        ripetizioni: e.ripetizioni || '',
        carico:      e.carico      || '',
        recupero:    e.recupero    || '',
        note:        e.note        || '',
        ordine:      ei
      }));
      if (esRows.length) {
        const { error: errE } = await supabase.from('esercizi').insert(esRows);
        if (errE) throw new Error(`esercizi tipo ${t.id}: ` + errE.message);
      }
    }
    console.log(`[migrate] ✓ scheda "${s.nome}" (${(s.tipi||[]).length} tipi)`);
  }

  // ─── WEIGHT LOGS ───────────────────────────────────────────────────────────
  if (weightLogs.length) {
    const rows = weightLogs.map(l => ({
      id:      l.id,
      date:    l.date,
      es_nome: l.esNome || '',
      carico:  l.carico || '',
      note:    l.note   || ''
    }));
    const { error } = await supabase.from('weight_logs').insert(rows);
    if (error) throw new Error('weight_logs: ' + error.message);
    console.log(`[migrate] ✓ ${rows.length} weight_logs inseriti`);
  }

  console.log('[migrate] Migrazione completata.');
}

migrate().catch(e => {
  console.error('[migrate] ERRORE:', e.message);
  process.exit(1);
});
