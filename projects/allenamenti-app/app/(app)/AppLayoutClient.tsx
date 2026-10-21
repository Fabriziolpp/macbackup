'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AppProvider, useApp } from '@/providers/AppProvider';
import GtTabBar from '@/components/GtTabBar';
import Toast from '@/components/Toast';
import { listPendingWorkouts, removePendingWorkout, updatePendingWorkoutRetries } from '@/lib/idb';

const IMMERSIVE_PATHS = new Set(['/live/countdown', '/live/workout', '/live/summary', '/live/emom', '/live/pausa']);

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setAuthToken, loadWorkouts, loadSchede, loadWeightLogs, authToken, apiFetch, toast } = useApp();
  const pendingRetriedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setAuthToken(session.access_token);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) setAuthToken(session.access_token);
      else { setAuthToken(null); router.push('/login'); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authToken) {
      loadWorkouts();
      loadSchede();
      loadWeightLogs();
    }
  }, [authToken]);

  // F6 SPEC §3.6: al primo authToken disponibile, prova a flushare la
  // coda dei pending workouts (POST falliti per offline). Run-once via ref.
  useEffect(() => {
    if (!authToken || pendingRetriedRef.current) return;
    pendingRetriedRef.current = true;
    (async () => {
      try {
        const pending = await listPendingWorkouts();
        if (pending.length === 0) return;
        let succeeded = 0;
        let failed = 0;
        for (const p of pending) {
          try {
            const r = await apiFetch('/api/workouts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(p.payload),
            });
            if (r.ok) {
              await removePendingWorkout(p.id);
              succeeded += 1;
            } else {
              await updatePendingWorkoutRetries(p.id, p.retries + 1);
              failed += 1;
            }
          } catch {
            await updatePendingWorkoutRetries(p.id, p.retries + 1);
            failed += 1;
          }
        }
        if (succeeded > 0) {
          await loadWorkouts();
          toast(
            failed > 0
              ? `Sincronizzati ${succeeded} allenamenti offline (${failed} ancora in coda).`
              : `Sincronizzati ${succeeded} allenamenti offline.`,
            'success',
          );
        }
      } catch (err) {
        console.error('[pending-flush]', err);
      }
    })();
  }, [authToken, apiFetch, loadWorkouts, toast]);

  if (!authToken) return null;

  const path = pathname ?? '';
  const isLive = path.startsWith('/live');
  const isImmersive = IMMERSIVE_PATHS.has(path);
  const isDark = isLive || path === '/schede';

  return (
    <div
      data-theme={isDark ? 'dark' : undefined}
      style={{
        minHeight: '100dvh',
        // --gt-bg è theme-aware (dark override → #0A0A0A; light → #F1EFEA warm off-white).
        background: 'var(--gt-bg)',
      }}
    >
      <main
        style={{
          width: '100%',
          // Top strip rimosso (R1: logout nel Profilo): le pagine non-immersive
          // ricevono qui la safe-area superiore.
          paddingTop: 'env(safe-area-inset-top)',
          // Tab bar floating (pill a ~18px dal fondo): margine ampio per non coprire il contenuto.
          paddingBottom: isImmersive
            ? 'env(safe-area-inset-bottom)'
            : 'calc(100px + env(safe-area-inset-bottom))',
        }}
      >
        {children}
      </main>
      {!isImmersive && <GtTabBar />}
      <Toast />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
