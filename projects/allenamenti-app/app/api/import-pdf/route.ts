import { NextResponse } from 'next/server';
import { requireAuth, authError } from '@/lib/auth';
import { newId } from '@/lib/utils';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
// Una scheda lunga può richiedere più di un minuto di generazione: con Fluid compute
// il piano Hobby di Vercel arriva a 300 s. Il client aspetta un po' di più (archivio).
export const maxDuration = 300;

// 4096 token troncavano le schede lunghe (stop_reason max_tokens → JSON incompleto).
const MAX_OUTPUT_TOKENS = 16000;

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);

    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) return NextResponse.json({ error: 'API_KEY_MISSING' }, { status: 500 });

    const formData = await request.formData();
    const file = formData.get('pdf') as File | null;
    if (!file) return NextResponse.json({ error: 'Nessun file caricato.' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    console.log(`[import-pdf] File ricevuto: ${file.name}, ${buffer.length} bytes`);

    console.log('[import-pdf] Invio PDF a Claude API (document base64)…');
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          {
            type: 'text',
            text: `Sei un assistente per palestra. Analizza questa scheda di allenamento PDF e restituisci SOLO un oggetto JSON valido, senza markdown, senza spiegazioni, senza testo prima o dopo. Scrivi il JSON compatto: su una sola riga, senza indentazione né a capo.

Schema JSON richiesto:
{
  "nome": "stringa — nome della scheda (es. Scheda Marzo 2026). Se non trovato, usa 'Scheda importata'.",
  "mese": "stringa — mese o periodo se indicato (es. 'Marzo 2026'), altrimenti stringa vuota",
  "tipi": [
    {
      "nome": "stringa — nome del GIORNO (es. 'Giorno A', 'Giorno 1', 'Upper Body'). UN tipo per giorno.",
      "esercizi": [
        {
          "titolo": "stringa — nome dell'esercizio",
          "ripetizioni": "stringa — es. '4x8', '3x12', '5x5', oppure stringa vuota",
          "carico": "stringa — es. '80kg', '60%', 'corpo libero', oppure stringa vuota",
          "recupero": "stringa — es. '90s', '2min', oppure stringa vuota",
          "note": "stringa — indicazioni tecniche, varianti, oppure stringa vuota"
        }
      ],
      "blocchi": [
        {
          "tipo": "stringa — 'circuito_amrap' oppure 'circuito_giri'",
          "durata_minuti": "numero — minuti del circuito AMRAP (es. 20). null per circuito_giri",
          "giri_target": "numero — giri fissi per circuito_giri (es. 3). null per circuito_amrap (giri liberi)",
          "nota_comune": "stringa — nota tecnica comune al blocco, '' se assente",
          "esercizi": [
            {
              "titolo": "stringa — nome del movimento",
              "ripetizioni": "stringa — reps del movimento (es. '10'); '' se a tempo/isometrico",
              "carico": "stringa — '' se non indicato",
              "recupero": "stringa — '' (il circuito gestisce il timing)",
              "note": "stringa — cue tecnico del singolo movimento, '' se assente"
            }
          ]
        }
      ]
    }
  ]
}

Regole:
- UN tipo per ogni GIORNO della scheda (es. Giorno 1, Giorno 2, o Lunedì/Mercoledì). I circuiti/blocchi DENTRO un giorno NON sono tipi separati: vanno in 'blocchi' di quel giorno.
- Se la scheda non ha sezioni distinte, metti tutto in un unico tipo "Allenamento".
- 'esercizi' a livello di tipo = SOLO esercizi singoli fuori da circuiti. 'blocchi' = i circuiti. Se un giorno è tutto AMRAP, 'esercizi' resta [] e tutto va in 'blocchi'. Se un giorno non ha circuiti, 'blocchi' resta [].
- Mantieni i valori originali per serie/rip/carico (non convertire, copia testualmente).
- Non inventare dati non presenti nel PDF.

**Blocchi CIRCUITO / AMRAP — IMPORTANTE (raggruppamento):**
Un circuito è un GRUPPO di movimenti ripetuti ciclicamente, NON esercizi indipendenti. Riconoscilo così:
- Una lista di movimenti consecutivi (spesso bullet '- ...') con vicino (sopra o sotto) un marcatore di modalità tipo "AMRAP 20'", "AMRAP 12", "Circuito", "WOD" → è UN blocco, non N esercizi separati.
- Marcatore "AMRAP <N>" (o "<N>' AMRAP") → 'tipo'='circuito_amrap', 'durata_minuti'=N, 'giri_target'=null.
- Marcatore a giri fissi (es. "3/4 Giri", "3 Round" con tempi lavoro/recupero) → 'tipo'='circuito_giri', 'giri_target'=N (il maggiore se è un range), 'durata_minuti'=null. Metti i dettagli di tempo grezzi in 'nota_comune'; NON serve scomporre il timing per movimento.
- Una riga di testo libero adiacente al gruppo (es. "Usa elastico se necessario per i fermi") che NON è un movimento → è la 'nota_comune' del blocco, NON un esercizio.
- Ogni movimento del circuito è un esercizio dentro 'blocchi[].esercizi': 'titolo'=nome movimento, 'ripetizioni'=reps ('' se a tempo/isometrico come "Chin Up 10\" Fermo in chiusura"), 'carico'/'recupero'=''. NON ripetere la modalità AMRAP nelle note dei singoli movimenti: sta già nel blocco.
- Più gruppi nello stesso giorno = più blocchi (ordine come nel PDF). Es. un giorno con 2 AMRAP da 5 movimenti → 1 tipo con 'blocchi':[blocco1(5 es), blocco2(5 es)], 'esercizi':[].
- Mantieni l'ordine dei movimenti come nel PDF (= ordine di esecuzione nel circuito).

**EMOM:** lascia gli EMOM come esercizi singoli con la modalità nelle note (hanno una schermata dedicata), NON come blocco circuito.

**Notazione serie/ripetizioni "NsxM" — IMPORTANTE:**
Alcuni trainer scrivono le serie come 'NsxM' dove la 's' sta per "serie": '5sx10' = 5 serie da 10, '3sx30"' = 3 serie da 30 secondi, '4sx6' = 4 serie da 6. COPIALA TESTUALMENTE COSÌ COM'È in 'ripetizioni' (es. '5sx10'), NON convertirla in '5x10' né in altro: al parsing ci pensa l'app.
- 'RT' significa "ripetizioni": '15 RT' → ripetizioni '15'.
- '4 Serie Massime Ripetizioni' (serie a cedimento) → ripetizioni '4x Max'.

**Separare il CARICO dalle ripetizioni — IMPORTANTE:**
Spesso il carico è incollato alle serie o sta nel titolo dell'esercizio. Mettilo SEMPRE nel campo 'carico', lasciando in 'ripetizioni' solo la parte serie×reps:
- '5sx10 30kg' → ripetizioni '5sx10', carico '30kg'.
- '3sx15 +10kg' → ripetizioni '3sx15', carico '+10kg' (mantieni il '+' = sovraccarico).
- '5sx5 -35kg' → ripetizioni '5sx5', carico '-35kg' (mantieni il '-' = assistito/scarico).
- Titolo 'Dip elastico 15kg' → titolo 'Dip elastico', carico '15kg'.
- '@9' (RPE/intensità su 10) e '90% mav' / 'MAV' (carico autoregolato) sono INDICAZIONI DI CARICO: mettili in 'carico' (es. carico '@9', carico '90% MAV'), non nelle note.

**Multi-settimana con reps E carico insieme — IMPORTANTE:**
Quando una cella elenca più settimane ognuna con le proprie reps E il proprio carico, separa in DUE stringhe multi-settimana parallele, una in 'ripetizioni' e una in 'carico', con lo stesso formato 'Na sett. ...':
- PDF: '1a sett. 5sx10 30kg / 2a sett. 5sx7 35kg / 3a sett. 4sx5 40kg / 4a sett. 3sx3 45kg'
  → ripetizioni: '1a sett. 5sx10 / 2a sett. 5sx7 / 3a sett. 4sx5 / 4a sett. 3sx3'
  → carico: '1a sett. 30kg / 2a sett. 35kg / 3a sett. 40kg / 4a sett. 45kg'
- Se solo le reps cambiano per settimana (nessun carico), metti solo 'ripetizioni' multi-settimana e lascia 'carico' vuoto.

**Range con '/' (non per-settimana):**
Valori come recupero '90"/120"' o reps '10"/12"' SENZA prefisso 'Na sett.' sono un RANGE (minimo/massimo discrezionale): copiali testuali con la '/'. NON confonderli col formato multi-settimana 'Na sett.'.

**Tempo / cue tecnici → note:**
Indicazioni di tempo ed esecuzione ('3" Fase eccentrica', '2" fermo ginocchio', '1" fermo fronte barra', 'negative', 'Eccentrica lenta') vanno in 'note', non in carico né ripetizioni.

**Blocchi accessori → tipi separati:**
Sezioni complementari come 'Addome', 'Stretching', 'Cardio' (spesso liste fuori dalla tabella principale, a scelta libera) diventano 'tipi' a sé stanti, ognuno col proprio 'nome' e i propri esercizi. Lì la notazione è di solito 'NxM' (senza 's'): copiala com'è.`
          }
        ]
      }]
    });

    console.log(`[import-pdf] Risposta Claude ricevuta (stop_reason=${msg.stop_reason}, token in/out=${msg.usage.input_tokens}/${msg.usage.output_tokens}), parsing JSON…`);

    // Risposta interrotta per lunghezza: il JSON sarebbe incompleto, inutile provare a leggerlo.
    if (msg.stop_reason === 'max_tokens') {
      console.error(`[import-pdf] Risposta interrotta a ${msg.usage.output_tokens} token (max_tokens)`);
      return NextResponse.json(
        { error: "La scheda è troppo lunga per l'import automatico. Prova a dividere il PDF." },
        { status: 422 }
      );
    }

    let parsed: any;
    try {
      const block = msg.content[0];
      const rawText = block.type === 'text' ? block.text : '';
      const raw = rawText.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
      parsed = JSON.parse(raw);
    } catch {
      const block = msg.content[0];
      const rawText = block.type === 'text' ? block.text : '';
      console.error('[import-pdf] Risposta AI non parsabile:', rawText.slice(0, 300));
      return NextResponse.json(
        { error: "L'AI non ha restituito un JSON valido. Riprova o verifica il PDF." },
        { status: 422 }
      );
    }

    const schedaId = newId();
    const nuovaScheda = {
      id: schedaId,
      nome: parsed.nome || file.name.replace(/\.pdf$/i, ''),
      mese: parsed.mese || '',
      user_id: user.id
    };

    const { error: errS } = await supabase.from('schede').insert(nuovaScheda);
    if (errS) throw new Error('schede insert: ' + errS.message);

    // FIX6: un tipo per giorno, con esercizi singoli (blocco_id null) e/o blocchi
    // circuito. Tieni un tipo se ha almeno un esercizio singolo o un blocco con
    // esercizi.
    const hasTitolo = (arr: any[]) => (arr || []).some((e: any) => e?.titolo);
    const ALLOWED_BLOCCO = new Set(['circuito_amrap', 'circuito_giri', 'singolo']);
    const toIntOrNull = (v: any) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const mapEsercizio = (e: any, ei: number, tipoId: string, bloccoId: string | null) => ({
      id: newId(), tipo_id: tipoId, blocco_id: bloccoId,
      titolo:      String(e.titolo      || '').trim(),
      ripetizioni: String(e.ripetizioni || '').trim(),
      carico:      String(e.carico      || '').trim(),
      recupero:    String(e.recupero    || '').trim(),
      note:        String(e.note        || '').trim(),
      ordine:      ei, user_id: user.id,
    });
    const stripDb = ({ ordine, tipo_id, blocco_id, ...rest }: any) => rest;

    const tipiResult: any[] = [];
    const tipiParsed = (parsed.tipi || []).filter((t: any) =>
      hasTitolo(t.esercizi) || (t.blocchi || []).some((b: any) => hasTitolo(b.esercizi))
    );

    for (let ti = 0; ti < tipiParsed.length; ti++) {
      const t = tipiParsed[ti];
      const tipoId = newId();
      const { error: errT } = await supabase.from('tipi').insert({
        id: tipoId, scheda_id: schedaId, nome: t.nome || 'Allenamento', ordine: ti, user_id: user.id
      });
      if (errT) throw new Error('tipi insert: ' + errT.message);

      // Esercizi singoli del giorno (fuori da circuiti)
      const singoli = (t.esercizi || []).filter((e: any) => e?.titolo)
        .map((e: any, ei: number) => mapEsercizio(e, ei, tipoId, null));
      if (singoli.length) {
        const { error: errE } = await supabase.from('esercizi').insert(singoli);
        if (errE) throw new Error('esercizi insert: ' + errE.message);
      }

      // Blocchi circuito + i loro esercizi (blocco_id set)
      const blocchiResult: any[] = [];
      const blocchiParsed = (t.blocchi || []).filter((b: any) => hasTitolo(b.esercizi));
      for (let bi = 0; bi < blocchiParsed.length; bi++) {
        const b = blocchiParsed[bi];
        const bloccoTipo = ALLOWED_BLOCCO.has(b.tipo) ? b.tipo : 'circuito_amrap';
        const bloccoId = newId();
        const durataMinuti = toIntOrNull(b.durata_minuti);
        const giriTarget = toIntOrNull(b.giri_target);
        const notaComune = String(b.nota_comune || '').trim();
        const { error: errB } = await supabase.from('blocchi').insert({
          id: bloccoId, tipo_id: tipoId, ordine: bi, tipo: bloccoTipo,
          durata_minuti: durataMinuti, giri_target: giriTarget,
          nota_comune: notaComune || null, user_id: user.id,
        });
        if (errB) throw new Error('blocchi insert: ' + errB.message);

        const bEsercizi = (b.esercizi || []).filter((e: any) => e?.titolo)
          .map((e: any, ei: number) => mapEsercizio(e, ei, tipoId, bloccoId));
        if (bEsercizi.length) {
          const { error: errBE } = await supabase.from('esercizi').insert(bEsercizi);
          if (errBE) throw new Error('esercizi (blocco) insert: ' + errBE.message);
        }
        blocchiResult.push({
          id: bloccoId, tipo: bloccoTipo, durataMinuti, giriTarget,
          notaComune, esercizi: bEsercizi.map(stripDb),
        });
      }

      tipiResult.push({
        id: tipoId, nome: t.nome || 'Allenamento',
        esercizi: singoli.map(stripDb),
        blocchi: blocchiResult,
      });
    }

    const result = { ...nuovaScheda, tipi: tipiResult };
    console.log(`[import-pdf] Scheda "${result.nome}" importata (${tipiResult.length} tipi)`);
    return NextResponse.json(result, { status: 201 });

  } catch (e: any) {
    console.error('[import-pdf]', e.message);
    if (e.status === 401) return NextResponse.json({ error: 'ANTHROPIC_API_KEY non valida.' }, { status: 500 });
    if (e.status === 429) return NextResponse.json({ error: 'Limite API raggiunto. Riprova tra qualche secondo.' }, { status: 500 });
    if (e.status && e.status < 500) return authError(e);
    return NextResponse.json({ error: "Errore durante l'importazione: " + e.message }, { status: 500 });
  }
}
