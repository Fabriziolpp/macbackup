'use client';

import { useState } from 'react';

// Componente condiviso (design handoff): card allenamento usata in Home (Recenti)
// e Agenda. Ordine contenuti: 1) data·ora·durata  2) tipo · scheda  3) commento
// (senza virgolette, una riga). A destra ⋯ → popover Modifica/Elimina.
// `dateLabel` è precomputato dal chiamante (Home usa mese esteso, Agenda abbreviato).
export interface WorkoutCardData {
  id: string;
  tipo: string;
  scheda: string;
  durata: number;
  note?: string;
}

export default function WorkoutCard({
  w, dateLabel, onEdit, onDelete, onOpen,
}: {
  w: WorkoutCardData;
  dateLabel: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpen?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showScheda = w.scheda && w.scheda !== w.tipo;
  const hasMenu = !!onEdit || !!onDelete;

  return (
    <article
      onClick={onOpen}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'flex-start',
        background: 'var(--gt-card)',
        border: '1px solid var(--gt-border)',
        borderRadius: 18,
        padding: '16px 14px 16px 18px',
        cursor: onOpen ? 'pointer' : 'default',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 1. data · ora · durata */}
        <div
          style={{
            fontFamily: 'var(--font-barlow)', fontSize: 13, fontWeight: 600,
            color: 'var(--gt-text-secondary)', marginBottom: 6,
          }}
        >
          {dateLabel}
        </div>
        {/* 2. tipo · scheda */}
        <div style={{ lineHeight: 1.15, marginBottom: w.note ? 6 : 0 }}>
          <span style={{ fontFamily: 'var(--font-barlow)', fontSize: 19, fontWeight: 700, color: 'var(--gt-text-primary)' }}>
            {w.tipo}
          </span>
          {showScheda && (
            <span style={{ fontFamily: 'var(--font-barlow)', fontSize: 15, fontWeight: 500, color: 'var(--gt-text-secondary)' }}>
              {' · '}scheda {w.scheda}
            </span>
          )}
        </div>
        {/* 3. commento (senza virgolette, una riga) */}
        {w.note && (
          <div
            style={{
              fontFamily: 'var(--font-barlow)', fontSize: 13.5, color: 'var(--gt-text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {w.note}
          </div>
        )}
      </div>

      {/* ⋯ menu (solo se ci sono azioni) */}
      {hasMenu && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
          aria-label="Azioni allenamento"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          style={{
            flexShrink: 0, width: 44, height: 44, marginRight: -6, marginTop: -6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--gt-text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
          </svg>
        </button>
      )}

      {hasMenu && menuOpen && (
        <>
          {/* backdrop invisibile per chiudere on click fuori */}
          <div
            onClick={e => { e.stopPropagation(); setMenuOpen(false); }}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          />
          <div
            role="menu"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 48, right: 10, zIndex: 41,
              minWidth: 150,
              background: 'var(--gt-card)',
              border: '1px solid var(--gt-border)',
              borderRadius: 12,
              boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
              overflow: 'hidden',
            }}
          >
            {onEdit && <MenuItem label="Modifica" onClick={() => { setMenuOpen(false); onEdit(); }} />}
            {onEdit && onDelete && <div style={{ height: 1, background: 'var(--gt-border)' }} />}
            {onDelete && <MenuItem label="Elimina" danger onClick={() => { setMenuOpen(false); onDelete(); }} />}
          </div>
        </>
      )}
    </article>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-barlow)', fontSize: 15, fontWeight: 600,
        color: danger ? 'var(--gt-neg)' : 'var(--gt-text-primary)',
      }}
    >
      {label}
    </button>
  );
}
