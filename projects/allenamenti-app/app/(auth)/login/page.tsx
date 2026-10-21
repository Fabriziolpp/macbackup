'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/providers/AppProvider';

export default function LoginPage() {
  const router = useRouter();
  const { setAuthToken } = useApp();

  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function doLogin() {
    setError(''); setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'Email o password errati.' : err.message);
      return;
    }
    setAuthToken(data.session.access_token);
    router.push('/home');
  }

  async function doRegister() {
    setError(''); setSuccess(''); setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess('Registrazione completata! Controlla la tua email per confermare l\'account.');
  }

  async function doForgotPassword() {
    setError(''); setSuccess(''); setLoading(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess('Se l\'email è registrata, riceverai un link per resettare la password.');
  }

  function switchTab(next: 'login' | 'register' | 'forgot') {
    setTab(next); setError(''); setSuccess('');
  }

  const primaryAction = tab === 'login' ? doLogin : tab === 'register' ? doRegister : doForgotPassword;
  const primaryLabel = tab === 'login' ? 'Accedi' : tab === 'register' ? 'Registrati' : 'Invia link';

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--nk-white)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: 'var(--font-archivo), Helvetica, Arial, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo / header */}
        <div style={{ marginBottom: 48 }}>
          <p className="nk-kicker" style={{ marginBottom: 8 }}>Benvenuto</p>
          <h1 style={{
            fontFamily: 'var(--font-anton), Impact, sans-serif',
            fontSize: 'clamp(56px, 14vw, 80px)', textTransform: 'uppercase',
            lineHeight: 0.88, color: 'var(--nk-black)', fontWeight: 400, letterSpacing: '-0.01em',
            marginBottom: 12,
          }}>Allenamenti</h1>
          <p className="nk-body-muted">Traccia il tuo progresso. Ogni giorno.</p>
        </div>

        {/* Tab switcher */}
        <div className="nk-segmented" style={{ width: '100%', marginBottom: 28 }}>
          <button
            onClick={() => switchTab('login')}
            className="nk-segmented-btn"
            aria-selected={tab === 'login' || tab === 'forgot'}
            style={{ flex: 1 }}
          >
            Accedi
          </button>
          <button
            onClick={() => switchTab('register')}
            className="nk-segmented-btn"
            aria-selected={tab === 'register'}
            style={{ flex: 1 }}
          >
            Registrati
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="nk-form-label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tua@email.com" className="nk-input"
              onKeyDown={e => { if (e.key === 'Enter' && tab === 'forgot') doForgotPassword(); }} />
          </div>
          {tab !== 'forgot' && (
            <div>
              <label className="nk-form-label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className="nk-input"
                onKeyDown={e => { if (e.key === 'Enter' && tab === 'login') doLogin(); }} />
            </div>
          )}
        </div>

        {error && (
          <p style={{ fontSize: 13, color: 'var(--nk-red)', marginTop: 14 }}>{error}</p>
        )}
        {success && (
          <p style={{ fontSize: 13, color: 'var(--nk-green)', marginTop: 14 }}>{success}</p>
        )}

        <button
          onClick={primaryAction}
          disabled={loading}
          className="nk-btn-primary"
          style={{ width: '100%', marginTop: 24, opacity: loading ? 0.7 : 1 }}>
          {loading ? '…' : primaryLabel}
        </button>

        {tab === 'login' && (
          <button
            onClick={() => switchTab('forgot')}
            style={{
              display: 'block', margin: '14px auto 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--nk-muted)', textDecoration: 'underline',
              fontFamily: 'inherit',
            }}>
            Password dimenticata?
          </button>
        )}

        {tab === 'forgot' && (
          <button
            onClick={() => switchTab('login')}
            style={{
              display: 'block', margin: '14px auto 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--nk-muted)', textDecoration: 'underline',
              fontFamily: 'inherit',
            }}>
            Torna al login
          </button>
        )}

        {tab === 'register' && (
          <p className="nk-body-muted" style={{ textAlign: 'center', marginTop: 14, fontSize: 12 }}>
            Riceverai una email di conferma prima di poter accedere.
          </p>
        )}
      </div>
    </div>
  );
}
