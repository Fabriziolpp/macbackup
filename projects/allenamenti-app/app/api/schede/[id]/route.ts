import { NextResponse } from 'next/server';
import { requireAuth, authError } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAuth(request);
    const body = await request.json();
    const update: Record<string, any> = {
      nome: body.nome || '',
      mese: body.mese || '',
    };
    if (body.dataInizio !== undefined) update.data_inizio = body.dataInizio || null;
    if (body.weeks !== undefined) update.weeks = body.weeks ?? null;

    const { data, error } = await supabase
      .from('schede').update(update).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
    return NextResponse.json({
      id: data.id,
      nome: data.nome ?? '',
      mese: data.mese ?? '',
      dataInizio: data.data_inizio ?? undefined,
      weeks: data.weeks ?? undefined,
    });
  } catch (e) { return authError(e); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAuth(request);
    const { error } = await supabase.from('schede').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return authError(e); }
}
