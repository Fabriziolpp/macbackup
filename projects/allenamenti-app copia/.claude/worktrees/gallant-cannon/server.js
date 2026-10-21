require('dotenv').config();
const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const multer   = require('multer');
const pdfParse = require('pdf-parse');
const Anthropic = require('@anthropic-ai/sdk');
const supabase  = require('./supabaseClient');

const CONFIG_FILE = path.join(__dirname, 'config.json');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); }
  catch { return { anthropicApiKey: '' }; }
}
function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}
function getApiKey() {
  return process.env.ANTHROPIC_API_KEY || readConfig().anthropicApiKey || '';
}

const app  = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── WORKOUTS ─────────────────────────────────────────────────────────────────
app.get('/api/workouts', async (req, res) => {
  const { data, error } = await supabase.from('workouts').select('*').order('data');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/workouts', async (req, res) => {
  const workout = {
    id: newId(), data: req.body.data, ora: req.body.ora || '',
    scheda: req.body.scheda || '', tipo: req.body.tipo || '',
    durata: parseInt(req.body.durata, 10) || 0, note: req.body.note || ''
  };
  const { error } = await supabase.from('workouts').insert(workout);
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(workout);
});

app.put('/api/workouts/:id', async (req, res) => {
  const update = {
    data: req.body.data, ora: req.body.ora || '',
    scheda: req.body.scheda || '', tipo: req.body.tipo || '',
    durata: parseInt(req.body.durata, 10) || 0, note: req.body.note || ''
  };
  const { data, error } = await supabase
    .from('workouts').update(update).eq('id', req.params.id).select().single();
  if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/workouts/:id', async (req, res) => {
  const { error } = await supabase.from('workouts').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ─── SCHEDE ───────────────────────────────────────────────────────────────────
app.get('/api/schede', async (req, res) => {
  const { data, error } = await supabase
    .from('schede')
    .select('*, tipi(*, esercizi(*))');
  if (error) return res.status(500).json({ error: error.message });

  const shaped = data.map(s => ({
    id: s.id, nome: s.nome, mese: s.mese,
    tipi: (s.tipi || [])
      .sort((a, b) => a.ordine - b.ordine)
      .map(t => ({
        id: t.id, nome: t.nome,
        esercizi: (t.esercizi || [])
          .sort((a, b) => a.ordine - b.ordine)
          .map(({ ordine, tipo_id, ...rest }) => rest)
      }))
  }));
  res.json(shaped);
});

app.post('/api/schede', async (req, res) => {
  const scheda = { id: newId(), nome: req.body.nome || '', mese: req.body.mese || '' };
  const { error } = await supabase.from('schede').insert(scheda);
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ...scheda, tipi: [] });
});

app.put('/api/schede/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('schede').update({ nome: req.body.nome || '', mese: req.body.mese || '' })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/schede/:id', async (req, res) => {
  const { error } = await supabase.from('schede').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.post('/api/schede/:id/duplica', async (req, res) => {
  // Carica scheda originale con tipi ed esercizi
  const { data: orig, error: errO } = await supabase
    .from('schede').select('*, tipi(*, esercizi(*))').eq('id', req.params.id).single();
  if (errO) return res.status(404).json({ error: 'Non trovata' });

  const nuovaScheda = {
    id: newId(),
    nome: req.body.nome || orig.nome + ' (copia)',
    mese: req.body.mese || ''
  };
  const { error: errS } = await supabase.from('schede').insert(nuovaScheda);
  if (errS) return res.status(500).json({ error: errS.message });

  const tipiOrdinati = (orig.tipi || []).sort((a, b) => a.ordine - b.ordine);
  const nuoviTipi = [];

  for (let ti = 0; ti < tipiOrdinati.length; ti++) {
    const t = tipiOrdinati[ti];
    const nuovoTipo = { id: newId(), scheda_id: nuovaScheda.id, nome: t.nome, ordine: ti };
    const { error: errT } = await supabase.from('tipi').insert(nuovoTipo);
    if (errT) return res.status(500).json({ error: errT.message });

    const esercizi = (t.esercizi || [])
      .sort((a, b) => a.ordine - b.ordine)
      .map((e, ei) => ({
        id: newId(), tipo_id: nuovoTipo.id,
        titolo: e.titolo, ripetizioni: e.ripetizioni || '',
        carico: e.carico || '', recupero: e.recupero || '',
        note: e.note || '', ordine: ei
      }));

    if (esercizi.length) {
      const { error: errE } = await supabase.from('esercizi').insert(esercizi);
      if (errE) return res.status(500).json({ error: errE.message });
    }

    nuoviTipi.push({
      id: nuovoTipo.id, nome: nuovoTipo.nome,
      esercizi: esercizi.map(({ ordine, tipo_id, ...rest }) => rest)
    });
  }

  res.status(201).json({ ...nuovaScheda, tipi: nuoviTipi });
});

// ─── TIPI ─────────────────────────────────────────────────────────────────────
app.post('/api/schede/:schedaId/tipi', async (req, res) => {
  // Calcola ordine massimo esistente
  const { data: existing } = await supabase
    .from('tipi').select('ordine').eq('scheda_id', req.params.schedaId);
  const maxOrdine = existing && existing.length
    ? Math.max(...existing.map(t => t.ordine))
    : -1;

  const tipo = { id: newId(), scheda_id: req.params.schedaId, nome: req.body.nome || '', ordine: maxOrdine + 1 };
  const { error } = await supabase.from('tipi').insert(tipo);
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ id: tipo.id, nome: tipo.nome, esercizi: [] });
});

app.put('/api/schede/:schedaId/tipi/:tipoId', async (req, res) => {
  const { data, error } = await supabase
    .from('tipi').update({ nome: req.body.nome || '' })
    .eq('id', req.params.tipoId).eq('scheda_id', req.params.schedaId)
    .select().single();
  if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/schede/:schedaId/tipi/:tipoId', async (req, res) => {
  const { error } = await supabase.from('tipi').delete().eq('id', req.params.tipoId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.put('/api/schede/:schedaId/tipi/:tipoId/reorder', async (req, res) => {
  const ordine = req.body.ordine; // array di id nell'ordine desiderato
  const updates = ordine.map((id, idx) =>
    supabase.from('esercizi').update({ ordine: idx }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const failed = results.find(r => r.error);
  if (failed) return res.status(500).json({ error: failed.error.message });
  res.json({ ok: true });
});

// ─── ESERCIZI ─────────────────────────────────────────────────────────────────
app.post('/api/schede/:schedaId/tipi/:tipoId/esercizi', async (req, res) => {
  const { data: existing } = await supabase
    .from('esercizi').select('ordine').eq('tipo_id', req.params.tipoId);
  const maxOrdine = existing && existing.length
    ? Math.max(...existing.map(e => e.ordine))
    : -1;

  const esercizio = {
    id: newId(), tipo_id: req.params.tipoId,
    titolo: req.body.titolo || '', ripetizioni: req.body.ripetizioni || '',
    carico: req.body.carico || '', recupero: req.body.recupero || '',
    note: req.body.note || '', ordine: maxOrdine + 1
  };
  const { error } = await supabase.from('esercizi').insert(esercizio);
  if (error) return res.status(500).json({ error: error.message });
  const { ordine, tipo_id, ...response } = esercizio;
  res.status(201).json(response);
});

app.put('/api/schede/:schedaId/tipi/:tipoId/esercizi/:esId', async (req, res) => {
  const { data, error } = await supabase
    .from('esercizi')
    .update({
      titolo: req.body.titolo || '', ripetizioni: req.body.ripetizioni || '',
      carico: req.body.carico || '', recupero: req.body.recupero || '',
      note: req.body.note || ''
    })
    .eq('id', req.params.esId).select().single();
  if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });
  const { ordine, tipo_id, ...response } = data;
  res.json(response);
});

app.delete('/api/schede/:schedaId/tipi/:tipoId/esercizi/:esId', async (req, res) => {
  const { error } = await supabase.from('esercizi').delete().eq('id', req.params.esId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ─── STORICO PESI ─────────────────────────────────────────────────────────────
app.get('/api/weight-logs', async (req, res) => {
  const { data, error } = await supabase.from('weight_logs').select('*').order('date');
  if (error) return res.status(500).json({ error: error.message });
  // Mappa es_nome → esNome per compatibilità frontend
  res.json(data.map(({ es_nome, ...rest }) => ({ ...rest, esNome: es_nome })));
});

app.post('/api/weight-logs', async (req, res) => {
  const log = {
    id: newId(), date: req.body.date,
    es_nome: req.body.esNome || '',
    carico: req.body.carico || '', note: req.body.note || ''
  };
  const { error } = await supabase.from('weight_logs').insert(log);
  if (error) return res.status(500).json({ error: error.message });
  const { es_nome, ...rest } = log;
  res.status(201).json({ ...rest, esNome: es_nome });
});

app.delete('/api/weight-logs/:id', async (req, res) => {
  const { error } = await supabase.from('weight_logs').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ─── CONFIG API ───────────────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  const key = getApiKey();
  res.json({ hasKey: !!key, maskedKey: key ? '••••••••' + key.slice(-6) : '' });
});

app.post('/api/config', (req, res) => {
  const key = (req.body.anthropicApiKey || '').trim();
  if (!key) return res.status(400).json({ error: 'Chiave non valida.' });
  const cfg = readConfig();
  cfg.anthropicApiKey = key;
  writeConfig(cfg);
  res.json({ ok: true });
});

app.delete('/api/config/key', (req, res) => {
  const cfg = readConfig();
  cfg.anthropicApiKey = '';
  writeConfig(cfg);
  res.json({ ok: true });
});

// ─── IMPORT PDF ───────────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.post('/api/import-pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nessun file caricato.' });

  const apiKey = getApiKey();
  if (!apiKey) return res.status(500).json({ error: 'API_KEY_MISSING' });

  try {
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text.trim();
    if (!text || text.length < 30) {
      return res.status(422).json({ error: 'Il PDF non contiene testo leggibile (potrebbe essere un\'immagine scansionata).' });
    }

    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Sei un assistente per palestra. Analizza il testo estratto da una scheda di allenamento e restituisci SOLO un oggetto JSON valido, senza markdown, senza spiegazioni, senza testo prima o dopo.

Schema JSON richiesto:
{
  "nome": "stringa — nome della scheda (es. Scheda Marzo 2026). Se non trovato, usa il nome del file o 'Scheda importata'.",
  "mese": "stringa — mese o periodo se indicato (es. 'Marzo 2026'), altrimenti stringa vuota",
  "tipi": [
    {
      "nome": "stringa — nome del giorno o blocco (es. 'Giorno A', 'Giorno 1', 'Upper Body', 'Forza')",
      "esercizi": [
        {
          "titolo": "stringa — nome dell'esercizio",
          "ripetizioni": "stringa — es. '4x8', '3x12', '5x5', oppure stringa vuota",
          "carico": "stringa — es. '80kg', '60%', 'corpo libero', oppure stringa vuota",
          "recupero": "stringa — es. '90s', '2min', oppure stringa vuota",
          "note": "stringa — indicazioni tecniche, varianti, oppure stringa vuota"
        }
      ]
    }
  ]
}

Regole:
- Se ci sono più giorni/blocchi (es. Giorno A e Giorno B, o Lunedì/Mercoledì), creane uno per ogni blocco.
- Se la scheda non ha sezioni distinte, metti tutti gli esercizi in un unico tipo chiamato "Allenamento".
- Mantieni i valori originali per serie/rip/carico (non convertire, copia testualmente).
- Non inventare dati non presenti nel testo.

Testo della scheda:
${text}`
      }]
    });

    let parsed;
    try {
      const raw = msg.content[0].text.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
      parsed = JSON.parse(raw);
    } catch {
      console.error('[import-pdf] Risposta AI non parsabile:', msg.content[0].text.slice(0, 300));
      return res.status(422).json({ error: 'L\'AI non ha restituito un JSON valido. Riprova o verifica il PDF.' });
    }

    // Costruisci scheda con nuovi ID
    const schedaId = newId();
    const nuovaScheda = {
      id: schedaId,
      nome: parsed.nome || req.file.originalname.replace(/\.pdf$/i, ''),
      mese: parsed.mese || ''
    };

    const { error: errS } = await supabase.from('schede').insert(nuovaScheda);
    if (errS) throw new Error('schede insert: ' + errS.message);

    const tipiResult = [];
    const tipiParsed = (parsed.tipi || []).filter(t => (t.esercizi || []).some(e => e.titolo));

    for (let ti = 0; ti < tipiParsed.length; ti++) {
      const t = tipiParsed[ti];
      const tipoId = newId();
      const { error: errT } = await supabase.from('tipi').insert({
        id: tipoId, scheda_id: schedaId, nome: t.nome || 'Allenamento', ordine: ti
      });
      if (errT) throw new Error('tipi insert: ' + errT.message);

      const esercizi = (t.esercizi || [])
        .filter(e => e.titolo)
        .map((e, ei) => ({
          id: newId(), tipo_id: tipoId,
          titolo:      String(e.titolo      || '').trim(),
          ripetizioni: String(e.ripetizioni || '').trim(),
          carico:      String(e.carico      || '').trim(),
          recupero:    String(e.recupero    || '').trim(),
          note:        String(e.note        || '').trim(),
          ordine:      ei
        }));

      if (esercizi.length) {
        const { error: errE } = await supabase.from('esercizi').insert(esercizi);
        if (errE) throw new Error('esercizi insert: ' + errE.message);
      }

      tipiResult.push({
        id: tipoId, nome: t.nome || 'Allenamento',
        esercizi: esercizi.map(({ ordine, tipo_id, ...rest }) => rest)
      });
    }

    const result = { ...nuovaScheda, tipi: tipiResult };
    console.log(`[import-pdf] Scheda "${result.nome}" importata (${tipiResult.length} tipi)`);
    res.status(201).json(result);

  } catch (e) {
    console.error('[import-pdf]', e.message);
    if (e.status === 401) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non valida.' });
    if (e.status === 429) return res.status(500).json({ error: 'Limite API raggiunto. Riprova tra qualche secondo.' });
    res.status(500).json({ error: 'Errore durante l\'importazione: ' + e.message });
  }
});

// ─── START ────────────────────────────────────────────────────────────────────
if (!getApiKey()) {
  console.warn('[attenzione] Nessuna API key configurata — impostala dalla tab Schede nell\'app.');
}

app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
