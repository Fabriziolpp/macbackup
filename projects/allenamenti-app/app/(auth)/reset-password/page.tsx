'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true); setChecking(false); setError('');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setReady(true); setChecking(false); }
      else {
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) { setReady(true); setChecking(false); }
            else {
              setChecking(false);
              setError('Link non valido o scaduto. Richiedi un nuovo link dalla pagina di login.');
            }
          });
        }, 500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function submit() {
    if (password.length < 6) { setError('La password deve avere almeno 6 caratteri.'); return; }
    if (password !== confirm) { setError('Le password non coincidono.'); return; }
    setError(''); setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess('Password aggiornata! Verrai reindirizzato…');
    setTimeout(() => router.push('/home'), 1200);
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--nk-white)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: 'var(--font-archivo), Helvetica, Arial, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ marginBottom: 48 }}>
          <p className="nk-kicker" style={{ marginBottom: 8 }}>Reset</p>
          <h1 style={{
            fontFamily: 'var(--font-anton), Impact, sans-serif',
            fontSize: 'clamp(48px, 12vw, 68px)', textTransform: 'uppercase',
            lineHeight: 0.88, color: 'var(--nk-black)', fontWeight: 400, letterSpacing: '-0.01em',
            marginBottom: 12,
          }}>Nuova password</h1>
          <p className="nk-body-muted">Inserisci e conferma la nuova password del tuo account.</p>
        </div>

        {checking && (
          <p className="nk-body-muted" style={{ textAlign: 'center', fontSize: 13 }}>
            Verifica link in corso…
          </p>
        )}

        {!checking && ready && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="nk-form-label">Nuova password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className="nk-input"
                  autoComplete="new-password" />
              </div>
              <div>
                <label className="nk-form-label">Conferma password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••" className="nk-input"
                  autoComplete="new-password"
                  onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: 'var(--nk-red)', marginTop: 14 }}>{error}</p>
            )}
            {success && (
              <p style={{ fontSize: 13, color: 'var(--nk-green)', marginTop: 14 }}>{success}</p>
            )}

            <button
              onClick={submit}
              disabled={loading || !!success}
              className="nk-btn-primary"
              style={{ width: '100%', marginTop: 24, opacity: loading ? 0.7 : 1 }}>
              {loading ? '…' : 'Aggiorna password'}
            </button>
          </>
        )}

        {!checking && !ready && (
          <>
            {error && (
              <p style={{ fontSize: 13, color: 'var(--nk-red)', marginTop: 14 }}>{error}</p>
            )}
            <button
              onClick={() => router.push('/login')}
              className="nk-btn-primary"
              style={{ width: '100%', marginTop: 24 }}>
              Torna al login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
