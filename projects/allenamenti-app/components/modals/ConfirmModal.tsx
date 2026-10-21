'use client';

interface Props {
  msg: string;
  onConfirm: () => void;
  onClose: () => void;
  // Override opzionali (default = comportamento storico "Conferma / Elimina").
  kicker?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
}

export default function ConfirmModal({
  msg, onConfirm, onClose,
  kicker = 'Conferma',
  confirmLabel = 'Elimina',
  cancelLabel = 'Annulla',
  confirmVariant = 'danger',
}: Props) {
  return (
    <>
      <div onClick={onClose} className="nk-modal-scrim" />
      <div className="nk-modal-center">
        <div onClick={e => e.stopPropagation()} className="nk-modal-body">
          <p className="nk-kicker" style={{ marginBottom: 12 }}>{kicker}</p>
          <p className="nk-body" style={{ marginBottom: 28 }}>{msg}</p>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} className="nk-btn-outline" style={{ flex:1 }}>
              {cancelLabel}
            </button>
            <button
              onClick={() => { onClose(); onConfirm(); }}
              className={confirmVariant === 'primary' ? 'nk-btn-primary' : 'nk-btn-danger'}
              style={{ flex:1 }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
