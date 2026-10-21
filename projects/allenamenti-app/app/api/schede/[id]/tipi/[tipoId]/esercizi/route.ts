import { NextResponse } from 'next/server';
import { requireAuth, authError } from '@/lib/auth';
import { newId } from '@/lib/utils';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; tipoId: string }> }) {
  try {
    const { tipoId } = await params;
    const { user, supabase } = await requireAuth(request);
    const body = await request.json();

    const { data: existing } = await supabase
      .from('esercizi').select('ordine').eq('tipo_id', tipoId);
    const maxOrdine = existing && existing.length
      ? Math.max(...existing.map((e: any) => e.ordine))
      : -1;

    const row: Record<string, any> = {
      id: newId(),
      tipo_id: tipoId,
      titolo: body.titolo || '',
      ripetizioni: body.ripetizioni || '',
      carico: body.carico || '',
      recupero: body.recupero || '',
      note: body.note || '',
      sets_target: body.setsTarget ?? null,
      ordine: maxOrdine + 1,
      user_id: user.id,
    };
    if (body.exerciseId !== undefined) row.exercise_id = body.exerciseId;
    if (body.restSeconds !== undefined) row.rest_seconds = body.restSeconds;
    const { error } = await supabase.from('esercizi').insert(row);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      id: row.id,
      titolo: row.titolo,
      ripetizioni: row.ripetizioni,
      carico: row.carico,
      recupero: row.recupero,
      note: row.note,
      setsTarget: row.sets_target ?? undefined,
      exerciseId: row.exercise_id ?? undefined,
      restSeconds: row.rest_seconds ?? undefined,
    }, { status: 201 });
  } catch (e) { return authError(e); }
}
