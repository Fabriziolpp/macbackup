import { NextResponse } from 'next/server';
import { requireAuth, authError } from '@/lib/auth';
import { newId } from '@/lib/utils';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, supabase } = await requireAuth(request);
    const body = await request.json();

    const { data: orig, error: errO } = await supabase
      .from('schede').select('*, tipi(*, esercizi(*), blocchi(*))').eq('id', id).single();
    if (errO) return NextResponse.json({ error: 'Non trovata' }, { status: 404 });

    const nuovaScheda = {
      id: newId(),
      nome: body.nome || (orig as any).nome + ' (copia)',
      mese: body.mese || '',
      user_id: user.id
    };
    const { error: errS } = await supabase.from('schede').insert(nuovaScheda);
    if (errS) return NextResponse.json({ error: errS.message }, { status: 500 });

    const tipiOrdinati = ((orig as any).tipi || []).sort((a: any, b: any) => a.ordine - b.ordine);
    const nuoviTipi = [];

    for (let ti = 0; ti < tipiOrdinati.length; ti++) {
      const t = tipiOrdinati[ti];
      const nuovoTipo = { id: newId(), scheda_id: nuovaScheda.id, nome: t.nome, ordine: ti, user_id: user.id };
      const { error: errT } = await supabase.from('tipi').insert(nuovoTipo);
      if (errT) return NextResponse.json({ error: errT.message }, { status: 500 });

      // FIX6: copia i blocchi rimappando id vecchio→nuovo, così gli esercizi
      // del circuito possono ripuntare al blocco copiato.
      const bloccoIdMap = new Map<string, string>();
      const blocchiOrdinati = ((t.blocchi || []) as any[]).sort((a, b) => a.ordine - b.ordine);
      for (let bi = 0; bi < blocchiOrdinati.length; bi++) {
        const b = blocchiOrdinati[bi];
        const nuovoBloccoId = newId();
        bloccoIdMap.set(b.id, nuovoBloccoId);
        const { error: errB } = await supabase.from('blocchi').insert({
          id: nuovoBloccoId, tipo_id: nuovoTipo.id, ordine: bi, tipo: b.tipo,
          durata_minuti: b.durata_minuti ?? null, giri_target: b.giri_target ?? null,
          nota_comune: b.nota_comune ?? null, user_id: user.id,
        });
        if (errB) return NextResponse.json({ error: errB.message }, { status: 500 });
      }

      // Esercizi: preserva ordine originale e rimappa blocco_id (null resta null).
      const esercizi = (t.esercizi || [])
        .sort((a: any, b: any) => a.ordine - b.ordine)
        .map((e: any) => ({
          id: newId(), tipo_id: nuovoTipo.id,
          blocco_id: e.blocco_id ? (bloccoIdMap.get(e.blocco_id) ?? null) : null,
          titolo: e.titolo, ripetizioni: e.ripetizioni || '',
          carico: e.carico || '', recupero: e.recupero || '',
          note: e.note || '', ordine: e.ordine ?? 0, user_id: user.id
        }));

      if (esercizi.length) {
        const { error: errE } = await supabase.from('esercizi').insert(esercizi);
        if (errE) return NextResponse.json({ error: errE.message }, { status: 500 });
      }

      nuoviTipi.push({
        id: nuovoTipo.id, nome: nuovoTipo.nome,
        esercizi: esercizi.filter((e: any) => !e.blocco_id).map(({ ordine, tipo_id, blocco_id, ...rest }: any) => rest),
        blocchi: blocchiOrdinati.map((b: any) => ({ id: bloccoIdMap.get(b.id), tipo: b.tipo })),
      });
    }

    return NextResponse.json({ ...nuovaScheda, tipi: nuoviTipi }, { status: 201 });
  } catch (e) { return authError(e); }
}
