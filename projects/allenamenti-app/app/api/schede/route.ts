import { NextResponse } from 'next/server';
import { requireAuth, authError } from '@/lib/auth';
import { newId } from '@/lib/utils';

function shapeEsercizio(e: any) {
  return {
    id: e.id,
    titolo: e.titolo ?? '',
    ripetizioni: e.ripetizioni ?? '',
    carico: e.carico ?? '',
    recupero: e.recupero ?? '',
    note: e.note ?? '',
    setsTarget: e.sets_target ?? undefined,
    exerciseId: e.exercise_id ?? undefined,
    restSeconds: e.rest_seconds ?? undefined,
    bloccoId: e.blocco_id ?? undefined,
  };
}

const byOrdine = (a: any, b: any) => (a.ordine ?? 0) - (b.ordine ?? 0);

export async function GET(request: Request) {
  try {
    const { supabase } = await requireAuth(request);
    const { data, error } = await supabase
      .from('schede')
      .select('*, tipi(*, esercizi(*), blocchi(*))');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const sorted = (data as any[]).sort((a, b) => b.id.localeCompare(a.id));
    const shaped = sorted.map(s => ({
      id: s.id,
      nome: s.nome ?? '',
      mese: s.mese ?? '',
      dataInizio: s.data_inizio ?? undefined,
      weeks: s.weeks ?? undefined,
      tipi: (s.tipi || [])
        .sort(byOrdine)
        .map((t: any) => {
          // FIX6: partiziona gli esercizi del giorno tra singoli (blocco_id null)
          // e quelli appartenenti a un blocco circuito.
          const allEs = (t.esercizi || []).slice().sort(byOrdine);
          return {
            id: t.id,
            nome: t.nome,
            esercizi: allEs.filter((e: any) => !e.blocco_id).map(shapeEsercizio),
            blocchi: (t.blocchi || [])
              .sort(byOrdine)
              .map((b: any) => ({
                id: b.id,
                tipo: b.tipo ?? 'circuito_amrap',
                durataMinuti: b.durata_minuti ?? undefined,
                giriTarget: b.giri_target ?? undefined,
                notaComune: b.nota_comune ?? undefined,
                esercizi: allEs.filter((e: any) => e.blocco_id === b.id).map(shapeEsercizio),
              })),
          };
        }),
    }));
    return NextResponse.json(shaped);
  } catch (e) { return authError(e); }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const body = await request.json();
    const row = {
      id: newId(),
      nome: body.nome || '',
      mese: body.mese || '',
      data_inizio: body.dataInizio ?? null,
      weeks: body.weeks ?? null,
      user_id: user.id,
    };
    const { error } = await supabase.from('schede').insert(row);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      id: row.id,
      nome: row.nome,
      mese: row.mese,
      dataInizio: row.data_inizio ?? undefined,
      weeks: row.weeks ?? undefined,
      tipi: [],
    }, { status: 201 });
  } catch (e) { return authError(e); }
}
