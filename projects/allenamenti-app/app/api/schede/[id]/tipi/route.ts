import { NextResponse } from 'next/server';
import { requireAuth, authError } from '@/lib/auth';
import { newId } from '@/lib/utils';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: schedaId } = await params;
    const { user, supabase } = await requireAuth(request);
    const body = await request.json();

    const { data: existing } = await supabase
      .from('tipi').select('ordine').eq('scheda_id', schedaId);
    const maxOrdine = existing && existing.length
      ? Math.max(...existing.map((t: any) => t.ordine))
      : -1;

    const tipo = { id: newId(), scheda_id: schedaId, nome: body.nome || '', ordine: maxOrdine + 1, user_id: user.id };
    const { error } = await supabase.from('tipi').insert(tipo);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: tipo.id, nome: tipo.nome, esercizi: [], blocchi: [] }, { status: 201 });
  } catch (e) { return authError(e); }
}
