import { NextResponse } from 'next/server';
import { requireAuth, authError } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; tipoId: string }> }) {
  try {
    await params;
    const { supabase } = await requireAuth(request);
    const body = await request.json();
    const ordine: string[] = body.ordine;
    const updates = ordine.map((id, idx) =>
      supabase.from('esercizi').update({ ordine: idx }).eq('id', id)
    );
    const results = await Promise.all(updates);
    const failed = results.find(r => r.error);
    if (failed) return NextResponse.json({ error: (failed as any).error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return authError(e); }
}
