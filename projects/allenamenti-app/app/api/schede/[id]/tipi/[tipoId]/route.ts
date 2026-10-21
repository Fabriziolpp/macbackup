import { NextResponse } from 'next/server';
import { requireAuth, authError } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; tipoId: string }> }) {
  try {
    const { id: schedaId, tipoId } = await params;
    const { supabase } = await requireAuth(request);
    const body = await request.json();
    const { data, error } = await supabase
      .from('tipi').update({ nome: body.nome || '' })
      .eq('id', tipoId).eq('scheda_id', schedaId)
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
    return NextResponse.json(data);
  } catch (e) { return authError(e); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; tipoId: string }> }) {
  try {
    const { tipoId } = await params;
    const { supabase } = await requireAuth(request);
    const { error } = await supabase.from('tipi').delete().eq('id', tipoId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return authError(e); }
}
