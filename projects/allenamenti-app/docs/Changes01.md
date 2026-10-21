# Changes01 — 2026-04-08

## Stack Tecnologico

| Layer | Tecnologia | Versione |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2 |
| Linguaggio | TypeScript | 6.x |
| UI | React | 19 |
| Styling | Tailwind CSS | 4.x |
| Animazioni | Framer Motion | latest |
| Charts | Chart.js + react-chartjs-2 | 4.x |
| Database | Supabase (PostgreSQL + RLS) | hosted |
| Auth | Supabase Auth (JWT) | — |
| AI | Anthropic Claude API (claude-sonnet-4-6) | SDK 0.78 |
| PDF parsing | pdf-parse | 1.1.1 |
| Mobile (iOS) | Capacitor | latest |
| Deploy | Vercel | — |
| Repo | GitHub (`Fabriziolpp/allenamenti-app`) | — |

---

## Modifiche del giorno

### Fase 1 — Setup Next.js

- Installazione manuale di Next.js 16 nel repo esistente (Express+HTML), preservando la git history
- Creazione di `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`
- Aggiornamento `package.json` con gli script `dev`, `build`, `start` (il vecchio `start:express` è mantenuto)
- Aggiornamento `.gitignore` con `.env.local`, `.next/`, `out/`

### Fase 2 — Variabili d'ambiente e lib/

- Creato `.env.local` con le variabili `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`
- Creato `lib/supabase.ts` — client Supabase pubblico con **lazy initialization via Proxy** (evita crash al build se le env var mancano)
- Creato `lib/auth.ts` — helper `requireAuth(request)` che verifica il JWT e restituisce `{ user, supabase }` con RLS attiva
- Creato `lib/utils.ts` — funzione `newId()` (nanoid-like con Date.now + Math.random)
- Creato `lib/dateUtils.ts` — helper date: `toDateString`, `formatDateIT`, `getMonday`, `isoWeek`, `addDays`, costanti `MESI`/`MESI_S`

### Fase 3 — API Routes (migrazione da Express)

Tutti gli endpoint di `server.js` migrati in Next.js App Router (`app/api/`):

| Express | Next.js Route |
|---------|--------------|
| `GET/POST /api/workouts` | `app/api/workouts/route.ts` |
| `PUT/DELETE /api/workouts/:id` | `app/api/workouts/[id]/route.ts` |
| `GET/POST /api/schede` | `app/api/schede/route.ts` |
| `PUT/DELETE /api/schede/:id` | `app/api/schede/[id]/route.ts` |
| `POST /api/schede/:id/duplica` | `app/api/schede/[id]/duplica/route.ts` |
| `POST /api/schede/:id/tipi` | `app/api/schede/[id]/tipi/route.ts` |
| `PUT/DELETE .../tipi/:tipoId` | `app/api/schede/[id]/tipi/[tipoId]/route.ts` |
| `PUT .../tipi/:tipoId/reorder` | `app/api/schede/[id]/tipi/[tipoId]/reorder/route.ts` |
| `POST .../esercizi` | `app/api/schede/[id]/tipi/[tipoId]/esercizi/route.ts` |
| `PUT/DELETE .../esercizi/:esId` | `app/api/schede/[id]/tipi/[tipoId]/esercizi/[esId]/route.ts` |
| `GET/POST /api/weight-logs` | `app/api/weight-logs/route.ts` |
| `DELETE /api/weight-logs/:id` | `app/api/weight-logs/[id]/route.ts` |
| `GET/POST /api/config` | `app/api/config/route.ts` |
| `DELETE /api/config/key` | `app/api/config/key/route.ts` |
| `POST /api/import-pdf` | `app/api/import-pdf/route.ts` |

Note API:
- `multer` sostituito con `request.formData()` nativo di Next.js
- `pdf-parse` importato **dinamicamente** dentro la funzione (fix errore `ENOENT` al build Vercel)
- `export const dynamic = 'force-dynamic'` su import-pdf per evitare pre-render
- Chiave Anthropic non più configurabile dall'UI — gestita solo via env vars

### Fase 4 — Frontend React (migrazione da HTML vanilla)

**Provider e stato globale**
- Creato `providers/AppProvider.tsx` — React Context con stato `workouts`, `schede`, `weightLogs`, `authToken`
- Funzioni `loadWorkouts`, `loadSchede`, `loadWeightLogs`, `apiFetch` (aggiunge automaticamente `Authorization: Bearer`)
- Toast system integrato nel provider

**Layout e routing**
- `app/layout.tsx` — root layout (font, metadata, globals.css)
- `app/page.tsx` — redirect automatico `/` → `/home`
- `app/(auth)/layout.tsx` — layout login (wrappa in AppProvider)
- `app/(app)/layout.tsx` — **Server Component** con `dynamic = 'force-dynamic'`, importa `AppLayoutClient`
- `app/(app)/AppLayoutClient.tsx` — auth guard (controlla sessione Supabase, redirect a `/login` se non autenticato), carica dati iniziali

**Pagine**
- `app/(auth)/login/page.tsx` — login/registrazione con Supabase Auth
- `app/(app)/home/page.tsx` — form registra allenamento, streak banner, lista recenti con paginazione "Carica altri", modali confirm/warn per duplicati
- `app/(app)/settimana/page.tsx` — navigazione settimane ISO, contatori allenamenti/minuti
- `app/(app)/mese/page.tsx` — chart settimanale (Chart.js), toggle Min/Sessioni
- `app/(app)/anno/page.tsx` — chart mensile, riepilogo per mese, lista completa
- `app/(app)/schede/page.tsx` — CRUD schede/tipi/esercizi, drag & drop ordine esercizi, import PDF con AI, tutti i modali

**Componenti condivisi**
- `components/Nav.tsx` — navigazione con `next/link` + `usePathname`, toggle dark mode, logout
- `components/Toast.tsx` — toast notification globale
- `components/WorkoutCard.tsx` — card allenamento riutilizzabile (editable/readonly)
- `components/modals/ConfirmModal.tsx` — conferma eliminazione
- `components/modals/WarnModal.tsx` — avviso duplicato
- `components/modals/SchedaModal.tsx` — crea/modifica scheda
- `components/modals/TipoModal.tsx` — crea/modifica tipo allenamento
- `components/modals/EsercizioModal.tsx` — crea/modifica esercizio
- `components/modals/StoricoPesiModal.tsx` — storico pesi con chart Chart.js

### Fase 5 — Capacitor iOS

- Installazione `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`
- Creato `capacitor.config.ts` con `appId: 'com.fabriziolp.allenamenti'`, WebView puntata alla URL Vercel
- Generato progetto Xcode (`ios/`)
- Per il deploy: `npx cap sync ios && npx cap open ios` → Signing → Archive → TestFlight

---

## Bug fix post-deploy

| Problema | Causa | Fix |
|----------|-------|-----|
| Deploy Vercel bloccato | Email del commit non associata all'account GitHub | `git commit --amend --reset-author` con email `fabrizio.lopresti@gmail.com` + force push |
| Build error `ENOENT .../05-versions-space.pdf` | `pdf-parse` legge un file di test all'import del modulo | Import dinamico `await import('pdf-parse')` dentro la funzione POST |
| Build error `supabaseUrl is required` | `createClient` chiamato a module-eval time durante la pre-render | Supabase client lazy via `Proxy`, `export const dynamic = 'force-dynamic'` sul layout `(app)` |

---

## File rimossi / deprecati

| File | Stato |
|------|-------|
| `server.js` | Deprecato — Express sostituito da Next.js API Routes |
| `supabaseClient.js` | Eliminato — sostituito da `lib/supabase.ts` |
| `public/index.html` | Sostituito dai componenti React |
| `.env` | Sostituito da `.env.local` |
