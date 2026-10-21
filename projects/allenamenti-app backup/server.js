const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const multer   = require('multer');
const pdfParse = require('pdf-parse');
const Anthropic = require('@anthropic-ai/sdk');

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
const DATA_FILE  = path.join(__dirname, 'data.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── BACKUP AUTOMATICO SETTIMANALE ───────────────────────────────────────────
fs.mkdirSync(BACKUP_DIR, { recursive: true });
function doBackup() {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const dest = path.join(BACKUP_DIR, `data-${date}.json`);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(DATA_FILE, dest);
      console.log(`[backup] Creato: data-${date}.json`);
    }
  } catch (e) { console.error('[backup] Errore:', e.message); }
}
doBackup();
setInterval(doBackup, 7 * 24 * 60 * 60 * 1000);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function readData() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  if (!data.weightLogs) data.weightLogs = [];
  return data;
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── WORKOUTS ─────────────────────────────────────────────────────────────────
app.get('/api/workouts', (req, res) => res.json(readData().workouts));

app.post('/api/workouts', (req, res) => {
  const data = readData();
  const workout = {
    id: newId(), data: req.body.data, ora: req.body.ora,
    scheda: req.body.scheda || '', tipo: req.body.tipo,
    durata: parseInt(req.body.durata, 10), note: req.body.note || ''
  };
  data.workouts.push(workout);
  writeData(data);
  res.status(201).json(workout);
});

app.put('/api/workouts/:id', (req, res) => {
  const data = readData();
  const idx = data.workouts.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Non trovato' });
  data.workouts[idx] = { ...data.workouts[idx], data: req.body.data, ora: req.body.ora,
    scheda: req.body.scheda || '', tipo: req.body.tipo,
    durata: parseInt(req.body.durata, 10), note: req.body.note || '' };
  writeData(data);
  res.json(data.workouts[idx]);
});

app.delete('/api/workouts/:id', (req, res) => {
  const data = readData();
  const idx = data.workouts.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Non trovato' });
  data.workouts.splice(idx, 1);
  writeData(data);
  res.json({ ok: true });
});

// ─── SCHEDE ───────────────────────────────────────────────────────────────────
app.get('/api/schede', (req, res) => res.json(readData().schede));

app.post('/api/schede', (req, res) => {
  const data = readData();
  const scheda = { id: newId(), nome: req.body.nome, mese: req.body.mese || '', tipi: [] };
  data.schede.push(scheda);
  writeData(data);
  res.status(201).json(scheda);
});

app.put('/api/schede/:id', (req, res) => {
  const data = readData();
  const idx = data.schede.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Non trovata' });
  data.schede[idx] = { ...data.schede[idx], nome: req.body.nome, mese: req.body.mese || '' };
  writeData(data);
  res.json(data.schede[idx]);
});

app.delete('/api/schede/:id', (req, res) => {
  const data = readData();
  const idx = data.schede.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Non trovata' });
  data.schede.splice(idx, 1);
  writeData(data);
  res.json({ ok: true });
});

app.post('/api/schede/:id/duplica', (req, res) => {
  const data = readData();
  const orig = data.schede.find(s => s.id === req.params.id);
  if (!orig) return res.status(404).json({ error: 'Non trovata' });
  const copia = {
    id: newId(), nome: req.body.nome || orig.nome + ' (copia)', mese: req.body.mese || '',
    tipi: orig.tipi.map(t => ({
      id: newId(), nome: t.nome,
      esercizi: t.esercizi.map(e => ({ ...e, id: newId() }))
    }))
  };
  data.schede.push(copia);
  writeData(data);
  res.status(201).json(copia);
});

// ─── TIPI ─────────────────────────────────────────────────────────────────────
app.post('/api/schede/:schedaId/tipi', (req, res) => {
  const data = readData();
  const scheda = data.schede.find(s => s.id === req.params.schedaId);
  if (!scheda) return res.status(404).json({ error: 'Scheda non trovata' });
  const tipo = { id: newId(), nome: req.body.nome, esercizi: [] };
  scheda.tipi.push(tipo);
  writeData(data);
  res.status(201).json(tipo);
});

app.put('/api/schede/:schedaId/tipi/:tipoId', (req, res) => {
  const data = readData();
  const scheda = data.schede.find(s => s.id === req.params.schedaId);
  if (!scheda) return res.status(404).json({ error: 'Scheda non trovata' });
  const tipoIdx = scheda.tipi.findIndex(t => t.id === req.params.tipoId);
  if (tipoIdx === -1) return res.status(404).json({ error: 'Tipo non trovato' });
  scheda.tipi[tipoIdx].nome = req.body.nome;
  writeData(data);
  res.json(scheda.tipi[tipoIdx]);
});

app.delete('/api/schede/:schedaId/tipi/:tipoId', (req, res) => {
  const data = readData();
  const scheda = data.schede.find(s => s.id === req.params.schedaId);
  if (!scheda) return res.status(404).json({ error: 'Scheda non trovata' });
  scheda.tipi = scheda.tipi.filter(t => t.id !== req.params.tipoId);
  writeData(data);
  res.json({ ok: true });
});

app.put('/api/schede/:schedaId/tipi/:tipoId/reorder', (req, res) => {
  const data = readData();
  const scheda = data.schede.find(s => s.id === req.params.schedaId);
  if (!scheda) return res.status(404).json({ error: 'Scheda non trovata' });
  const tipo = scheda.tipi.find(t => t.id === req.params.tipoId);
  if (!tipo) return res.status(404).json({ error: 'Tipo non trovato' });
  tipo.esercizi = req.body.ordine.map(id => tipo.esercizi.find(e => e.id === id)).filter(Boolean);
  writeData(data);
  res.json({ ok: true });
});

// ─── ESERCIZI ─────────────────────────────────────────────────────────────────
app.post('/api/schede/:schedaId/tipi/:tipoId/esercizi', (req, res) => {
  const data = readData();
  const scheda = data.schede.find(s => s.id === req.params.schedaId);
  if (!scheda) return res.status(404).json({ error: 'Scheda non trovata' });
  const tipo = scheda.tipi.find(t => t.id === req.params.tipoId);
  if (!tipo) return res.status(404).json({ error: 'Tipo non trovato' });
  const esercizio = {
    id: newId(), titolo: req.body.titolo, ripetizioni: req.body.ripetizioni || '',
    carico: req.body.carico || '', recupero: req.body.recupero || '', note: req.body.note || ''
  };
  tipo.esercizi.push(esercizio);
  writeData(data);
  res.status(201).json(esercizio);
});

app.put('/api/schede/:schedaId/tipi/:tipoId/esercizi/:esId', (req, res) => {
  const data = readData();
  const scheda = data.schede.find(s => s.id === req.params.schedaId);
  if (!scheda) return res.status(404).json({ error: 'Scheda non trovata' });
  const tipo = scheda.tipi.find(t => t.id === req.params.tipoId);
  if (!tipo) return res.status(404).json({ error: 'Tipo non trovato' });
  const esIdx = tipo.esercizi.findIndex(e => e.id === req.params.esId);
  if (esIdx === -1) return res.status(404).json({ error: 'Esercizio non trovato' });
  tipo.esercizi[esIdx] = {
    id: req.params.esId, titolo: req.body.titolo, ripetizioni: req.body.ripetizioni || '',
    carico: req.body.carico || '', recupero: req.body.recupero || '', note: req.body.note || ''
  };
  writeData(data);
  res.json(tipo.esercizi[esIdx]);
});

app.delete('/api/schede/:schedaId/tipi/:tipoId/esercizi/:esId', (req, res) => {
  const data = readData();
  const scheda = data.schede.find(s => s.id === req.params.schedaId);
  if (!scheda) return res.status(404).json({ error: 'Scheda non trovata' });
  const tipo = scheda.tipi.find(t => t.id === req.params.tipoId);
  if (!tipo) return res.status(404).json({ error: 'Tipo non trovato' });
  tipo.esercizi = tipo.esercizi.filter(e => e.id !== req.params.esId);
  writeData(data);
  res.json({ ok: true });
});

// ─── STORICO PESI ─────────────────────────────────────────────────────────────
app.get('/api/weight-logs', (req, res) => res.json(readData().weightLogs));

app.post('/api/weight-logs', (req, res) => {
  const data = readData();
  const log = { id: newId(), date: req.body.date, esNome: req.body.esNome,
    carico: req.body.carico || '', note: req.body.note || '' };
  data.weightLogs.push(log);
  writeData(data);
  res.status(201).json(log);
});

app.delete('/api/weight-logs/:id', (req, res) => {
  const data = readData();
  const idx = data.weightLogs.findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Non trovato' });
  data.weightLogs.splice(idx, 1);
  writeData(data);
  res.json({ ok: true });
});

// ─── CONFIG API ───────────────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  const cfg = readConfig();
  // Mask the key: show only last 6 chars
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
    // 1. Estrai testo dal PDF
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text.trim();
    if (!text || text.length < 30) {
      return res.status(422).json({ error: 'Il PDF non contiene testo leggibile (potrebbe essere un\'immagine scansionata).' });
    }

    // 2. Chiedi a Claude di strutturare la scheda
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

    // 3. Parsa il JSON restituito
    let parsed;
    try {
      const raw = msg.content[0].text.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
      parsed = JSON.parse(raw);
    } catch {
      console.error('[import-pdf] Risposta AI non parsabile:', msg.content[0].text.slice(0, 300));
      return res.status(422).json({ error: 'L\'AI non ha restituito un JSON valido. Riprova o verifica il PDF.' });
    }

    // 4. Salva come scheda
    const data = readData();
    const scheda = {
      id: newId(),
      nome: parsed.nome || req.file.originalname.replace(/\.pdf$/i, ''),
      mese: parsed.mese || '',
      tipi: (parsed.tipi || []).map(t => ({
        id: newId(),
        nome: t.nome || 'Allenamento',
        esercizi: (t.esercizi || []).map(e => ({
          id: newId(),
          titolo:      String(e.titolo      || '').trim(),
          ripetizioni: String(e.ripetizioni || '').trim(),
          carico:      String(e.carico      || '').trim(),
          recupero:    String(e.recupero    || '').trim(),
          note:        String(e.note        || '').trim()
        })).filter(e => e.titolo)
      })).filter(t => t.esercizi.length > 0)
    };

    data.schede.push(scheda);
    writeData(data);

    console.log(`[import-pdf] Scheda "${scheda.nome}" importata (${scheda.tipi.length} tipi, ${scheda.tipi.reduce((s,t)=>s+t.esercizi.length,0)} esercizi)`);
    res.status(201).json(scheda);

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
  console.log(`Backup in: ${BACKUP_DIR}`);
});
