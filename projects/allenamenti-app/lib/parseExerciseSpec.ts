// Parsing degli spec esercizio importati da PDF (o inseriti a mano):
// - Multi-week format: "1a sett. <spec> / 2a sett. <spec> / ...".
// - Per-serie format: "<N>x<M>" oppure "<N>X<M>" — N serie, M reps ciascuna.
//
// repsLabel/loadLabel = lo spec della settimana corrente SENZA il prefisso
// "Na sett." (la settimana è già nota dal contesto della live, quindi è ridondante
// nelle card REPS/CARICO).
//
// Esempi:
//   reps="2x30\"", week=*           → setsTarget=2, repsLabel="2x30\"", repsPerSet="30\""
//   reps="1a sett. 15 RT / 4a sett. 24 RT", week=4
//                                   → setsTarget=1, repsLabel="24 RT", repsPerSet="24 RT"
//   reps="4a sett. 4x4", week=4     → setsTarget=4, repsLabel="4x4", repsPerSet="4"
//   reps="24 RT", week=*            → setsTarget=1, repsLabel="24 RT", repsPerSet="24 RT"

export interface ParsedSpec {
  setsTarget: number;
  repsLabel: string;
  loadLabel: string;
  repsPerSet: string;
  loadPerSet: string;
}

const WEEK_SEGMENT_RX = /(\d+)\s*[aA°]?\s*sett\.\s*([^/]+)/g;
// Serie×reps. La "s" opzionale copre la notazione "Nsx M" (s = serie) usata da
// alcuni trainer: "5sx10", "3sx30\"", "4sx6". "5x10" continua a funzionare.
const NX_M_RX = /^\s*(\d+)\s*(?:s|serie)?\s*[xX×]\s*(.+?)\s*$/i;
// Stessa notazione ma cercata OVUNQUE nella stringa (non ancorata a inizio):
// fallback per spec con prefisso non-NxM, es. "MAV3 + 3sx3" → sets=3, reps="3".
const NX_M_INLINE_RX = /(\d+)\s*(?:s|serie)?\s*[xX×]\s*(\S+)/i;
// Serie a cedimento: "4 Serie Massime Ripetizioni" → N serie con reps massime.
const SERIE_MASSIME_RX = /^\s*(\d+)\s*serie?\s+massime/i;

function extractWeekSegment(raw: string, week: number): { label: string; spec: string } {
  const matches = Array.from(raw.matchAll(WEEK_SEGMENT_RX));
  if (matches.length === 0) {
    // Stringa senza pattern multi-week → usa tutto
    return { label: raw.trim(), spec: raw.trim() };
  }
  const found = matches.find(m => parseInt(m[1], 10) === week);
  if (!found) {
    // Pattern presente ma la settimana scelta non è elencata → fallback all'originale
    return { label: raw.trim(), spec: raw.trim() };
  }
  const spec = found[2].trim();
  // Niente prefisso "Na sett.": la settimana è già nota nella live.
  return { label: spec, spec };
}

function parseNxM(spec: string): { sets: number; perSet: string } {
  // "4 Serie Massime Ripetizioni" → 4 serie a cedimento, reps = "Max".
  const sm = spec.match(SERIE_MASSIME_RX);
  if (sm) {
    const n = parseInt(sm[1], 10);
    if (Number.isFinite(n) && n > 0) return { sets: n, perSet: 'Max' };
  }
  const m = spec.match(NX_M_RX);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0) return { sets: n, perSet: m[2].trim() };
  }
  // Fallback: NsxM presente ma non a inizio stringa (es. "MAV3 + 3sx3").
  const inline = spec.match(NX_M_INLINE_RX);
  if (inline) {
    const n = parseInt(inline[1], 10);
    if (Number.isFinite(n) && n > 0) return { sets: n, perSet: inline[2].trim() };
  }
  return { sets: 1, perSet: spec };
}

// Parsing del campo `recupero` di un esercizio in secondi.
// Audit dei valori reali in data.json (2026-05-28) ha mostrato 9 varianti
// distinte; la funzione le gestisce tutte:
//
//   ''                  → null
//   '//'                → null  (separator AMRAP/Circuito = "non applicabile")
//   '60"', '90"', '120"' → 60, 90, 120
//   '90"/120"'          → 90  (range discrezionale: "almeno 90, fino a 120" → minimo committato)
//   'Completo'          → null  (FIX5b: gestito da parseRecupero come 'stopwatch')
//   'Resto del minuto'  → null  (FIX5b: parseRecupero lo mappa a countdown 60s)
//
// Forme aggiuntive supportate per robustezza vs PDF importer e input manuale:
//   '90s', '90 sec', '90sec.', '90'
//   '2min', '1.5min', '1,5 min', '1 m'
//   '1\'' (apostrofo = minuti per notazione 1'30")
//
// Multi-segment '/': è un RANGE discrezionale (es. '90"/120"' = riposa 90, fino a
// 120 se serve). Ritorna il minimo dei segmenti parseabili (il target committato).
// NB: la variazione per-settimana è espressa col prefisso 'Na sett.' a monte
// (extractWeekSegment), non con '/', quindi '/' qui non è più per-settimana.
//
// Restituisce null se non parseabile → caller fa fallback (FIX5: rest_seconds
// numerico → questo parser sul recupero string → DEFAULT_REST_SECONDS=90).
export function parseRecuperoSeconds(raw: string, week: number = 1): number | null {
  const s = (raw || '').trim();
  if (!s) return null;

  // Multi-segment '/' = range discrezionale → minimo dei segmenti parseabili.
  // I segmenti vuoti (es. '//' → ['','',''] dopo split) vengono filtrati.
  if (s.includes('/')) {
    const parts = s.split('/').map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      const vals = parts
        .map(p => parseRecuperoSeconds(p, week))
        .filter((v): v is number => v != null);
      return vals.length ? Math.min(...vals) : null;
    }
    // Se filter ha lasciato 0 o 1 segmento, fall through al single-segment.
    if (parts.length === 0) return null; // es. '//'
  }

  const lower = s.toLowerCase();

  // Semantici non-numerici → null (fallback default lato caller).
  if (lower === 'completo' || lower === 'resto del minuto') return null;

  // Minuti: '2min', '1.5min', '1,5 min', "1'"
  const minMatch = lower.match(/^(\d+(?:[.,]\d+)?)\s*(?:m(?:in)?\.?|')$/);
  if (minMatch) {
    const v = parseFloat(minMatch[1].replace(',', '.'));
    return Number.isFinite(v) && v > 0 ? Math.round(v * 60) : null;
  }

  // Secondi: '60"', '60s', '60 sec', '60sec.', '60'
  const secMatch = lower.match(/^(\d+(?:[.,]\d+)?)\s*(?:s(?:ec)?\.?|"|''|′′)?$/);
  if (secMatch) {
    const v = parseFloat(secMatch[1].replace(',', '.'));
    return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  }

  return null;
}

// FIX5b: il recupero ha due comportamenti timer distinti.
//  - 'countdown': un target numerico verso cui l'anello si riempie. Copre
//    fixed ('60"'), range ('60"/90"' → minimo), minuti, 'Resto del minuto' (→60s
//    fallback numerico) e il default.
//  - 'stopwatch': cronometro che conta in su; l'utente termina con "Start Next".
//    Solo 'Completo' (recupero pieno a sensazione).
// `seconds` = target countdown in secondi; null → il caller applica
// DEFAULT_REST_SECONDS. In modalità stopwatch `seconds` è null (nessun target).
export type RestMode = 'countdown' | 'stopwatch';

export interface ParsedRecupero {
  seconds: number | null;
  mode: RestMode;
}

export function parseRecupero(raw: string, week: number = 1): ParsedRecupero {
  const lower = (raw || '').trim().toLowerCase();
  if (lower === 'completo') return { seconds: null, mode: 'stopwatch' };
  if (lower === 'resto del minuto') return { seconds: 60, mode: 'countdown' };
  return { seconds: parseRecuperoSeconds(raw, week), mode: 'countdown' };
}

export function parseExerciseSpec(reps: string, carico: string, week: number): ParsedSpec {
  const r = (reps || '').trim();
  const c = (carico || '').trim();

  if (!r) {
    return {
      setsTarget: 1,
      repsLabel: '—',
      loadLabel: c || '—',
      repsPerSet: '—',
      loadPerSet: c || '—',
    };
  }

  const repsSeg = extractWeekSegment(r, week);
  const nx = parseNxM(repsSeg.spec);

  let loadLabel: string;
  let loadPerSet: string;
  if (!c) {
    loadLabel = '—';
    loadPerSet = '—';
  } else {
    const loadSeg = extractWeekSegment(c, week);
    loadLabel = loadSeg.label;
    loadPerSet = loadSeg.spec;
  }

  return {
    setsTarget: nx.sets,
    repsLabel: repsSeg.label,
    loadLabel,
    repsPerSet: nx.perSet,
    loadPerSet,
  };
}
