# AP1 Fase 0 — Inventario (dati reali dal repo)

> Prodotto il 2026-10-13 sul branch `ap1/fase0-spike` (Task 2 del piano
> `docs/superpowers/plans/2026-07-21-ap1-fase0-setup-export-spike.md`).
> Spec di riferimento: `docs/superpowers/specs/2026-07-21-ap1-mobile-native-design.md`.
> Ogni riga deriva da comandi eseguiti sul repo o da query read-only sul progetto Supabase
> `lzwyhokkvzxlnubsenmf`, non da assunzioni.

## Baseline (Task 1)

| Voce | Valore reale | vs spec |
|---|---|---|
| Next.js | `^16.2.2` (installato 16.2.2, Turbopack) | ✅ |
| React | `^19.2.4` | ✅ |
| Capacitor | core/ios/cli `^8.3.1` (iOS via **SPM**, niente CocoaPods) | ✅ |
| idb | `^8.0.3` | ✅ |
| supabase-js | `^2.99.2` | ✅ |
| `npm install` | ok, lockfile invariato, nessun warning peer-deps | — |
| `npx tsc --noEmit` | 0 errori | — |
| `npm run build` (senza export) | ok — tutte le pagine `(app)` risultano `ƒ Dynamic` per via di `force-dynamic` nel layout | — |
| `npm run dev` | ok: `/`→307 `/home`, `/login` 200, `/home` 200, `/api/schede` 401 senza token | — |
| Env locali | `.env.local` con `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` (host = ref corretto), auth `/settings` raggiungibile | login end-to-end non testato (servono credenziali) |

## Pagine (export-safety)

18 `page.tsx` (+ 3 layout). 14 pagine `'use client'`, 4 server: **tutte e 4 sono solo `redirect()`**.

| Path | 'use client'? | Rischio export | Note |
|---|---|---|---|
| `app/page.tsx` (`/`) | no | medio | solo `redirect('/home')`. In export diventa HTML di redirect; vedi riga "Router Capacitor" sotto |
| `app/(app)/anno/page.tsx` | no | basso | solo `redirect('/calendario?v=anno')` |
| `app/(app)/mese/page.tsx` | no | basso | solo `redirect('/calendario?v=mese')` |
| `app/(app)/settimana/page.tsx` | no | basso | solo `redirect('/calendario?v=settimana')` |
| `app/(app)/calendario/page.tsx` | sì | basso | `useSearchParams` già dentro `<Suspense>` |
| `app/(app)/home/page.tsx` | sì | basso | 3 chiamate `/api/workouts*` |
| `app/(app)/live/page.tsx` | sì | basso | |
| `app/(app)/live/countdown/page.tsx` | sì | basso | |
| `app/(app)/live/emom/page.tsx` | sì | basso | |
| `app/(app)/live/pausa/page.tsx` | sì | basso | |
| `app/(app)/live/summary/page.tsx` | sì | basso | POST `/api/workouts` (+ coda pending) |
| `app/(app)/live/workout/page.tsx` | sì | basso | |
| `app/(app)/profilo/page.tsx` | sì | basso | |
| `app/(app)/profilo/preferenze/page.tsx` | sì | basso | |
| `app/(app)/schede/page.tsx` | sì | basso | |
| `app/(app)/schede/archivio/page.tsx` | sì | basso | 12 chiamate API (CRUD schede + `import-pdf`) |
| `app/(auth)/login/page.tsx` | sì | basso | `resetPasswordForEmail(redirectTo = window.location.origin + '/reset-password')` → deep link in nativo |
| `app/(auth)/reset-password/page.tsx` | sì | basso | `updateUser({ password })` |
| `app/layout.tsx` | no (server) | basso | `next/font/google` (Anton, Archivo, Barlow, Barlow Condensed) → font **self-hosted a build-time**, nessun CDN a runtime |
| `app/(app)/layout.tsx` | no (server) | **alto** | `export const dynamic = 'force-dynamic'` → incompatibile con `output: 'export'` |
| `app/(auth)/layout.tsx` | no (server) | basso | wrappa `AppProvider` (client) |

## Route API (migrazione)

16 route handler. **Chiamanti client: 22 call site in 6 file, tutti via `apiFetch`** (`providers/AppProvider.tsx`) → un solo punto di aggancio da sostituire.
Ogni route usa `requireAuth` (`lib/auth.ts`): verifica JWT + client supabase-js **con anon key + JWT utente** → le stesse query lato client hanno identica semantica RLS.

| Path | Metodi | Gruppo | Chiamanti | Target |
|---|---|---|---|---|
| `schede` | GET POST | A thin (+ shaping albero FIX6 e ordinamento) | AppProvider, archivio | supabase-js + funzione di shaping condivisa |
| `schede/[id]` | PUT DELETE | A thin | archivio | supabase-js |
| `schede/[id]/duplica` | POST | A, ma multi-step **non transazionale** (scheda→tipi→blocchi→esercizi) | archivio | **RPC Postgres** atomica consigliata (o sequenza client) |
| `schede/[id]/tipi` | POST | A (max `ordine` + insert) | archivio | supabase-js |
| `schede/[id]/tipi/[tipoId]` | PUT DELETE | A thin | archivio | supabase-js |
| `schede/[id]/tipi/[tipoId]/reorder` | PUT | A (N update in parallelo) | archivio | supabase-js (o RPC) |
| `schede/[id]/tipi/[tipoId]/esercizi` | POST | A (max `ordine` + insert) | archivio | supabase-js |
| `schede/[id]/tipi/[tipoId]/esercizi/[esId]` | PUT DELETE | A thin | archivio | supabase-js |
| `workouts` | GET POST | A (+ `shapeWorkout`) | AppProvider, home, summary Live, flush coda pending | supabase-js (+ idempotenza in Fase 3) |
| `workouts/[id]` | PUT DELETE | A (+ `shapeWorkout`) | home | supabase-js |
| `weight-logs` | GET POST | A (mapping `es_nome`↔`esNome`) | AppProvider, StoricoPesiModal | supabase-js |
| `weight-logs/[id]` | DELETE | A thin | StoricoPesiModal | supabase-js |
| `import-pdf` | POST | **B** — Anthropic (`claude-sonnet-4-6`, PDF base64) + 4 tipi di insert non transazionali, `maxDuration 60` | archivio | **Edge Function** (chiave lato server) |
| `motivation` | GET | **B** — Anthropic (`claude-haiku-4-5-20251001`) + cache in-memory 6h | **nessuno** (codice morto in UI) | non migrare ora; se Q1 lo riprende → Edge Function |
| `config` | GET POST | C — morta | **nessuno** | eliminare (GET espone gli ultimi 6 caratteri della chiave Anthropic) |
| `config/key` | DELETE | C — morta (no-op) | **nessuno** | eliminare |

Conteggio reale: **12 route CRUD in uso** + **1 route AI in uso** (`import-pdf`) + **3 route morte** (`motivation`, `config`, `config/key`).
Lo spec ("14 thin + 2 AI") è coerente nei numeri, ma il lavoro effettivo di Fase 2 è 12 + 1.

Nota da preservare/decidere in Fase 2: `duplica` oggi **non copia** `data_inizio`/`weeks` della scheda né `sets_target`/`exercise_id`/`rest_seconds` degli esercizi (comportamento attuale, forse bug).

## Moduli lib rilevanti

| File | Ruolo | Tocca in fase |
|---|---|---|
| `providers/AppProvider.tsx` | stato globale (schede/workouts/weightLogs), `apiFetch` con Bearer, loader | **2** — punto unico di sostituzione `apiFetch` → data module supabase-js |
| `app/(app)/AppLayoutClient.tsx` | auth guard client (`getSession`/`onAuthStateChange`), flush coda pending al primo token | 2, 3 |
| `lib/supabase.ts` | client supabase-js browser (lazy proxy) — già usato per l'auth | 2 (diventa il data layer), 4 (storage sessione nel guscio) |
| `lib/auth.ts` | `requireAuth` server-side | 2 — sparisce con le route (logica equivalente nell'Edge Function) |
| `lib/idb.ts` | IDB `gt-live` v2: `live-sessions`, `pending-workouts` (lib `idb`) | 3 — estendere (cache schede, coda mutation idempotente) |
| `lib/liveStore.ts` | store Zustand Live (384 righe), persistenza `ActiveSession` | 3 |
| `lib/utils.ts` | `newId()` = id testuali generati **lato client** (time-sortable) | 2/3 — compatibile con offline (nessun id server-side) |
| `lib/liveTypes.ts`, `lib/parseExerciseSpec.ts`, `lib/buildWorkoutPayload.ts` | dominio Live, funzioni pure | invariati |
| `lib/weeklyStats.ts`, `lib/dateUtils.ts` | statistiche pure (usate anche da `motivation`) | riusabili in Edge Function se serve |
| `lib/prefs.ts`, `lib/config.ts` | preferenze su `localStorage`, costanti | invariati (valutare `@capacitor/preferences` in 4) |
| `components/live/TimerRing.tsx` | `navigator.vibrate` + `Notification` API (con guard) | 5 — in WKWebView entrambi assenti → `@capacitor/haptics` + local notifications |

## Stato native / PWA

| Elemento | Stato attuale | Azione |
|---|---|---|
| capacitor server.url | presente: `https://allenamenti-app.vercel.app`; **nessun `webDir`** (default `www`, inesistente) | rimuovere `server.url`, impostare `webDir: 'out'` (Fase 4) |
| ios/App | scaffold Capacitor 8.3.1 via **SPM** (`CapApp-SPM`), 21 file tracciati; `ios/App/App/public` contiene solo stub `cordova*.js` vuoti | Fase 4: `cap sync` con bundle locale |
| Router Capacitor iOS | `CapacitorRouter`: ogni path **senza estensione → `/index.html` della root** (verificato in `Router.swift`); override possibile via `CAPBridgeViewController.router()` (`open`) | Fase 1/4: router custom (`/home` → `home.html`) o entry SPA unica |
| Info.plist | `CFBundleDisplayName` "Allenamenti"; `UIRequiredDeviceCapabilities` = `armv7` (legacy); nessun URL scheme; nessuna usage description (microfono/speech/notifiche) | Fase 4 (deep link), 5 (permessi), 6 (rename Vi.To) |
| public/ manifest+SW | `public/` **vuota**: niente manifest, service worker, icone web | creare (Fase 3, target web) |
| piattaforma android | assente; `@capacitor/android` non in dipendenze; Java e Android SDK/Studio **non installati** su questa macchina | aggiungere (Fase 4) — esito verifica Task 4 qui sotto |
| server.js legacy | presente e tracciato (Express, stesse route `/api/*` + static `public/`); **già non avviabile** (`pdf-parse` non installato); unico motivo di `express`/`multer`/`dotenv` | dismettere (Fase 2) con `supabaseClient.js`, `migrate-data.js`, script `start:express`, `"main"` in package.json |
| Webfont | solo `next/font/google` (self-hosted), nessun `@import`/CDN | rischio "CSP webfont" dello spec già mitigato — da confermare nell'output export |

### Esito verifica scaffolding Android (Task 4)

| Prova | Esito reale |
|---|---|
| `npx cap ls android` (repo) | `[error] android platform has not been added yet.` |
| `npx cap doctor` (repo) | installati cli/core/ios **8.3.1**, `@capacitor/android: not installed`; ultima versione **8.5.3**; "iOS looking great!" |
| `npx cap add android` (repo) | `[error] Could not find the android platform. You must install it in your project first, e.g. w/ npm install @capacitor/android` — nulla generato |
| `npm install --no-save @capacitor/android@8.3.1` + `npx cap add android` (worktree usa-e-getta) | ✅ `android platform added!`, con `[warn] sync could not run--missing www directory` (manca `webDir`) |
| stessa prova con config target (`webDir: 'out'`, senza `server.url`) + `npx cap sync android` / `ios` | ✅ export (250 file) copiato in `android/app/src/main/assets/public` e `ios/App/App/public`; `capacitor.config.json` senza `server.url` |
| Progetto generato | `applicationId com.fabriziolp.allenamenti`, minSdk 24, compile/target SDK 36, Gradle 8.14.3, permesso `INTERNET` |
| `./gradlew --version` | ❌ `Unable to locate a Java Runtime` → per **compilare** servono Android Studio (JDK incluso) + Android SDK 36 |

Conclusione: lo scaffolding **non** richiede SDK/Java; servono solo il pacchetto `@capacitor/android`
(stessa versione di core) e un `webDir`. Il prerequisito d'ambiente (Android Studio + SDK) pesa solo
sulla build/emulatore della Fase 4. Il generato di prova non è stato committato e il worktree è stato eliminato.

## Supabase (read-only, progetto `lzwyhokkvzxlnubsenmf`)

| Voce | Esito |
|---|---|
| Tabelle `public` | 7: `schede`, `tipi`, `blocchi`, `esercizi`, `exercises`, `workouts`, `weight_logs` |
| RLS | **attiva su tutte e 7**; una policy `ALL` di ownership per tabella (`auth.uid() = user_id`, o via join `tipi`→`schede` per `tipi`/`esercizi`) → premessa della Strada B confermata |
| Storico migration remoto | `create_tables`, `q1_infra` (20260612094108), `fix6_blocchi` (20260621203459) |
| Migration locali | `20260429000000_live_mode` (**assente dallo storico remoto**, ma colonne presenti → applicata fuori banda), `20260528000000_q1_infra`, `20260621000000_fix6_blocchi` (versioni ≠ remoto) |
| Colonne future | `schede.assigned_at`, `schede.stato`, `workouts.category` assenti (atteso: OFF1/MNGMT1/H1 non iniziati) |
| Edge Functions | nessuna |
| Security advisor | solo WARN "Leaked password protection disabled" |
| Auth | provider attivo: solo `email`; signup con conferma email (`mailer_autoconfirm: false`) |

## Ambiente di build (questa macchina)

| Tool | Stato |
|---|---|
| Node / npm | 24.14.0 / 11.9.0 ✅ |
| Xcode | 27.0 ✅ |
| CocoaPods | assente — non serve (iOS su SPM) |
| Java / Android SDK / Android Studio | **assenti** ❌ |
| Supabase CLI | assente (serve per sviluppare/deployare Edge Functions in locale; alternativa: MCP) |

## Dipendenze vulnerabili (`npm audit`: 16 — 4 critical, 9 high)

| Pacchetto | Note | Azione |
|---|---|---|
| `next` 16.2.2 | numerosi advisory (fino a critical) risolti in 16.3.x | aggiornare (≥ 16.3.8) — riguarda **già la produzione web** |
| `@capacitor/ios` 8.3.1 | GHSA-rvm3-566m-v7fv (≤ 8.3.4) — contenuto remoto caricabile sull'origin dell'app | aggiornare Capacitor (≥ 8.3.5) prima della Fase 4 |
| `express` → `proxy-addr`, `body-parser`, `path-to-regexp`, `qs`; `multer` | solo per `server.js` legacy | spariscono dismettendo `server.js` |
| `@capacitor/cli` → `tar`, `@xmldom/xmldom`, `brace-expansion` | tooling di build | aggiornare Capacitor |
| `postcss`, `sharp`, `ws`, `nanoid`, `source-map-js`, `baseline-browser-mapping` | transitive (Next/Tailwind/supabase) | `npm audit fix` dopo il bump di Next |
