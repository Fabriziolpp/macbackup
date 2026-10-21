import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function requireAuth(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw Object.assign(new Error('Non autenticato'), { status: 401 });
  }

  // Verifica il token con Supabase
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) {
    throw Object.assign(new Error('Token non valido o scaduto'), { status: 401 });
  }

  // Client con JWT utente — le RLS policy vengono applicate automaticamente
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  return { user, supabase: userClient };
}

export function authError(e: unknown) {
  const err = e as { status?: number; message?: string };
  const status = err.status ?? 500;
  return NextResponse.json({ error: err.message ?? 'Errore interno' }, { status });
}
