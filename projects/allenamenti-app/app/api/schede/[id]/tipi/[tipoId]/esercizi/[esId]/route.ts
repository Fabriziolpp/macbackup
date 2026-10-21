import { NextResponse } from 'next/server';
import { requireAuth, authError } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; tipoId: string; esId: string }> }) {
  try {
    const { esId } = await params;
    const { supabase } = await requireAuth(request);
    const body = await request.json();
    const update: Record<string, any> = {
      titolo: body.titolo || '',
      ripetizioni: body.ripetizioni || '',
      carico: body.carico || '',
      recupero: body.recupero || '',
      note: body.note || '',
    };
    if (body.setsTarget !== undefined) update.sets_target = body.setsTarget ?? null;
    if (body.exerciseId !== undefined) update.exercise_id = body.exerciseId ?? null;
    if (body.restSeconds !== undefined) update.rest_seconds = body.restSeconds ?? null;

    const { data, error } = await supabase
      .from('esercizi')
      .update(update)
      .eq('id', esId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
    return NextResponse.json({
      id: data.id,
      titolo: data.titolo ?? '',
      ripetizioni: data.ripetizioni ?? '',
      carico: data.carico ?? '',
      recupero: data.recupero ?? '',
      note: data.note ?? '',
      setsTarget: data.sets_target ?? undefined,
      exerciseId: data.exercise_id ?? undefined,
      restSeconds: data.rest_seconds ?? undefined,
    });
  } catch (e) { return authError(e); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; tipoId: string; esId: string }> }) {
  try {
    const { esId } = await params;
    const { supabase } = await requireAuth(request);
    const { error } = await supabase.from('esercizi').delete().eq('id', esId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return authError(e); }
}
