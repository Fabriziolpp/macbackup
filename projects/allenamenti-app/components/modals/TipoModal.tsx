'use client';

import { useState } from 'react';

interface Props { title: string; initialNome: string; onSave: (n: string) => void; onClose: () => void; }

export default function TipoModal({ title, initialNome, onSave, onClose }: Props) {
  const [nome, setNome] = useState(initialNome);
  return (
    <>
      <div onClick={onClose} className="nk-modal-scrim" />
      <div className="nk-modal-sheet">
        <div onClick={e => e.stopPropagation()} className="nk-modal-body">
          <p className="nk-kicker" style={{ marginBottom: 8 }}>Tipo</p>
          <h2 style={{
            fontFamily: 'var(--font-anton), Impact, sans-serif',
            fontSize: 32, textTransform: 'uppercase', lineHeight: 0.95,
            marginBottom: 24, color: 'var(--nk-black)', fontWeight: 400,
          }}>{title}</h2>

          <div>
            <label className="nk-form-label">Nome</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="nk-input"
              placeholder="es. Forza, Cardio…"
              onKeyDown={e => { if (e.key === 'Enter' && nome.trim()) onSave(nome.trim()); }}
            />
          </div>

          <div style={{ display:'flex', gap:10, marginTop:28 }}>
            <button onClick={onClose} className="nk-btn-outline" style={{ flex:1 }}>Annulla</button>
            <button
              onClick={() => { if (nome.trim()) onSave(nome.trim()); }}
              className="nk-btn-primary"
              style={{ flex:1 }}
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
