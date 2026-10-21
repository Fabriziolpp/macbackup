'use client';

import { useState } from 'react';

export interface ReorderItem { id: string; label: string }

interface Props {
  title: string;
  items: ReorderItem[];
  onSave: (orderedIds: string[]) => void;
  onClose: () => void;
}

// Modal di riordino generico (R4): sostituisce il drag&drop HTML5 — rotto su
// iOS touch — con frecce su/giù. Riordino in memoria; persistenza demandata al
// caller via onSave(orderedIds), chiamato una sola volta alla conferma.
export default function ReorderModal({ title, items, onSave, onClose }: Props) {
  const [order, setOrder] = useState<ReorderItem[]>(items);

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= order.length) return;
    const next = order.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  }

  return (
    <>
      <div onClick={onClose} className="nk-modal-scrim" />
      <div className="nk-modal-sheet">
        <div onClick={e => e.stopPropagation()} className="nk-modal-body">
          <p className="nk-kicker" style={{ marginBottom: 8 }}>Riordina</p>
          <h2 style={{
            fontFamily: 'var(--font-anton), Impact, sans-serif',
            fontSize: 32, textTransform: 'uppercase', lineHeight: 0.95,
            marginBottom: 24, color: 'var(--nk-black)', fontWeight: 400,
          }}>{title}</h2>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {order.map((it, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === order.length - 1;
              return (
                <li
                  key={it.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    background: 'var(--gt-input-bg)',
                    border: '1px solid var(--gt-border)',
                    borderRadius: 6,
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-barlow-condensed)', fontWeight: 900,
                    fontSize: 16, color: 'var(--gt-text-muted)', minWidth: 22,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    flex: 1, minWidth: 0,
                    fontFamily: 'var(--font-barlow)', fontWeight: 600, fontSize: 14,
                    color: 'var(--gt-text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {it.label}
                  </span>
                  <ArrowBtn
                    dir="up"
                    disabled={isFirst}
                    onClick={() => move(idx, -1)}
                    ariaLabel={`Sposta "${it.label}" su`}
                  />
                  <ArrowBtn
                    dir="down"
                    disabled={isLast}
                    onClick={() => move(idx, 1)}
                    ariaLabel={`Sposta "${it.label}" giù`}
                  />
                </li>
              );
            })}
          </ul>

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button onClick={onClose} className="nk-btn-outline" style={{ flex: 1 }}>Annulla</button>
            <button
              onClick={() => onSave(order.map(it => it.id))}
              className="nk-btn-primary"
              style={{ flex: 1 }}
            >
              Salva ordine
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ArrowBtn({
  dir, disabled, onClick, ariaLabel,
}: {
  dir: 'up' | 'down';
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        flexShrink: 0,
        width: 34, height: 34,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
        border: '1px solid var(--gt-border-strong)',
        borderRadius: 6,
        color: 'var(--gt-text-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {dir === 'up' ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
      </svg>
    </button>
  );
}
