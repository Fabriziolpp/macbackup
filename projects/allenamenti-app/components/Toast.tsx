'use client';

import { useApp } from '@/providers/AppProvider';

export default function Toast() {
  const { toastState } = useApp();
  if (!toastState.visible) return null;
  const bg: Record<string, string> = {
    success: 'var(--nk-black)',
    error:   'var(--nk-red)',
    info:    'var(--nk-blue)',
  };
  const type = toastState.type;
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 60, padding: '12px 24px',
      borderRadius: 'var(--nk-radius-pill)',
      background: bg[type] ?? bg.success,
      color: 'var(--nk-white)',
      fontFamily: 'var(--font-archivo), Helvetica, Arial, sans-serif',
      fontSize: 13, fontWeight: 500,
      letterSpacing: '1px', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {toastState.msg}
    </div>
  );
}
