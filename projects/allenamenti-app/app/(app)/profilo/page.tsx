'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// R1: schermata Profilo. Identità + Preferenze + Logout (Inbox omessa: nessun
// backend messaggi). Il logout, prima in GtTopStrip (rimosso), vive qui.
const APP_VERSION = '1.0.0';

function deriveName(email: string, fullName?: string): string {
  if (fullName && fullName.trim()) return fullName.trim();
  // Nessun nome reale (registrazione = solo email+password): deriva dall'email.
  const local = email.split('@')[0] || 'Atleta';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ') || 'Atleta';
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfiloPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      const mail = u?.email ?? '';
      setEmail(mail);
      setName(deriveName(mail, (u?.user_metadata as any)?.full_name));
    });
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div style={{ padding: '12px 16px 0', minHeight: '100dvh' }}>
      <h1
        style={{
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 40, fontWeight: 800, lineHeight: 0.9, letterSpacing: 0.3,
          textTransform: 'uppercase', color: 'var(--gt-text-primary)',
          margin: '8px 0 20px',
        }}
      >
        Profilo
      </h1>

      {/* Card identità (hero scuro) */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 16,
          background: 'var(--gt-hero-bg)',
          borderRadius: 24, padding: 22, marginBottom: 20,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
            background: 'var(--gt-accent)', color: '#0C0C0C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-barlow-condensed)', fontSize: 26, fontWeight: 800,
          }}
        >
          {name ? initials(name) : ''}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-barlow-condensed)',
              fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.05,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {name || '—'}
          </div>
          <div
            style={{
              marginTop: 2,
              fontFamily: 'var(--font-barlow)', fontSize: 13.5, fontWeight: 500,
              color: 'var(--gt-hero-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {email}
          </div>
        </div>
      </div>

      {/* Gruppo 1: Preferenze */}
      <div
        style={{
          background: 'var(--gt-card)',
          border: '1px solid var(--gt-border)',
          borderRadius: 18, overflow: 'hidden', marginBottom: 12,
        }}
      >
        <RowLink href="/profilo/preferenze" label="Preferenze" icon="gear" />
      </div>

      {/* Gruppo 2: Logout */}
      <div
        style={{
          background: 'var(--gt-card)',
          border: '1px solid var(--gt-border)',
          borderRadius: 18, overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            width: '100%', height: 64, padding: '0 16px',
            background: 'none', border: 'none', cursor: loggingOut ? 'default' : 'pointer',
            textAlign: 'left', color: 'var(--gt-neg)',
            opacity: loggingOut ? 0.6 : 1,
          }}
        >
          <IconTile name="exit" danger />
          <span style={{ fontFamily: 'var(--font-barlow)', fontSize: 16.5, fontWeight: 600 }}>
            {loggingOut ? 'Uscita…' : 'Logout'}
          </span>
        </button>
      </div>

      <div
        style={{
          textAlign: 'center', marginTop: 20,
          fontFamily: 'var(--font-barlow)', fontSize: 12, color: 'var(--gt-text-muted)',
        }}
      >
        GymTonic · v{APP_VERSION}
      </div>
    </div>
  );
}

function RowLink({ href, label, icon }: { href: string; label: string; icon: IconName }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        height: 64, padding: '0 16px', textDecoration: 'none',
        color: 'var(--gt-text-primary)',
      }}
    >
      <IconTile name={icon} />
      <span style={{ flex: 1, fontFamily: 'var(--font-barlow)', fontSize: 16.5, fontWeight: 600 }}>
        {label}
      </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gt-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

type IconName = 'gear' | 'exit';

function IconTile({ name, danger }: { name: IconName; danger?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: danger ? 'var(--gt-neg-bg)' : 'var(--gt-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: danger ? 'var(--gt-neg)' : 'var(--gt-text-primary)',
      }}
    >
      <Icon name={name} />
    </span>
  );
}

function Icon({ name }: { name: IconName }) {
  const c = {
    width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.8,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  if (name === 'gear') {
    return (
      <svg {...c}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    );
  }
  // exit
  return (
    <svg {...c}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
