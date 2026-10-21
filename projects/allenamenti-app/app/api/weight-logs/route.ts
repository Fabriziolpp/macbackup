import { NextResponse } from 'next/server';
import { requireAuth, authError } from '@/lib/auth';
import { newId } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const { supabase } = await requireAuth(request);
    const { data, error } = await supabase.from('weight_logs').select('*').order('date');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data.map(({ es_nome, ...rest }: any) => ({ ...rest, esNome: es_nome })));
  } catch (e) { return authError(e); }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const body = await request.json();
    const log = {
      id: newId(), date: body.date,
      es_nome: body.esNome || '',
      carico: body.carico || '', note: body.note || '',
      user_id: user.id
    };
    const { error } = await supabase.from('weight_logs').insert(log);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { es_nome, ...rest } = log;
    return NextResponse.json({ ...rest, esNome: es_nome }, { status: 201 });
  } catch (e) { return authError(e); }
}
