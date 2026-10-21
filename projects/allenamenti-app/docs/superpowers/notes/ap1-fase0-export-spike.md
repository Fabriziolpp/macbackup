# AP1 Fase 0 — Spike static export

> Eseguito il 2026-10-13 sul branch `ap1/fase0-spike` (Task 3). Next.js 16.2.2 (Turbopack).
> Config provata (quella del piano; committata solo sul branch spike, eliminato dopo aver portato
> queste note su `main`):
> `output: "export"`, `images: { unoptimized: true }`.

**Esito:** build **fallita** sul codice attuale. **4 classi di bloccanti**: 15 route API su 16
più il layout `(app)` con `force-dynamic`. Rimossi questi due ostacoli, l'export è **pulito**:
18/18 pagine statiche, nessun warning. Tutti gli errori qui sotto vengono dal log reale.

## Metodo

1. `npm run build` sul branch con la config di export: Next si ferma al **primo** lotto di errori.
   Il log riporta `/api/config` (classe 2) e `/api/schede/[id]/tipi/[tipoId]/esercizi` (classe 1).
2. Per avere l'elenco **completo**, iterazione in un worktree usa-e-getta (fuori dal repo, poi
   eliminato). A ogni build fallito si registra l'errore e si toglie la route che l'ha causato,
   cioè si simula la Fase 2. 10 iterazioni sulle route, poi una sul layout.
3. Ultimo build (route rimosse + `force-dynamic` tolto) → **exit 0**, `out/` ispezionato.

## Bloccanti rilevati (dal log reale)

| # | Errore (testo reale) | File | Causa | Fase di soluzione |
|---|---|---|---|---|
| 1 | `Page "/api/…" is missing "generateStaticParams()" so it cannot be used with "output: export" config.` | 9 route con segmento dinamico: `schede/[id]`, `schede/[id]/duplica`, `schede/[id]/tipi`, `schede/[id]/tipi/[tipoId]`, `…/[tipoId]/reorder`, `…/[tipoId]/esercizi`, `…/esercizi/[esId]`, `workouts/[id]`, `weight-logs/[id]` | route handler non esportabili: leggono `Authorization` e usano PUT/POST/DELETE. `generateStaticParams` **non** è una soluzione | **Fase 2** — migrazione a supabase-js |
| 2 | `export const dynamic = "force-static"/export const revalidate not configured on route "/api/…" with "output: export".` | 4 route con path statico: `schede`, `workouts`, `weight-logs`, `config` | come sopra: GET per-utente, non statico | **Fase 2** (`config`: eliminare, è morta) |
| 3 | `export const dynamic = "force-dynamic" on page "/api/…" cannot be used with "output: export".` | `import-pdf`, `motivation` | route AI con `force-dynamic` + chiave Anthropic | **Fase 2** — `import-pdf` su Edge Function; `motivation` è morta in UI |
| 4 | `Page with \`dynamic = "force-dynamic"\` couldn't be exported. \`output: "export"\` requires all pages be renderable statically…` (primo segnalato: `/live/countdown`, "Exporting 0/15") | `app/(app)/layout.tsx` (`export const dynamic = 'force-dynamic'`) → eredità su tutte le **15 pagine** del gruppo `(app)` | il layout forza il rendering dinamico | **Fase 1** — rimuovere 1 riga (verificato: senza, tutte le 15 pagine prerenderizzano) |
| — | nessun errore | `api/config/key` (solo `DELETE`) | Next la elenca come `ƒ` ma non blocca, e non compare in `out/` | Fase 2 — eliminare (morta) |

Non sono emersi: errori di prerender da accesso a `window`/`localStorage` durante l'SSR,
`useSearchParams` senza `Suspense` (in `calendario` è già dentro `Suspense`), immagini o font remoti.

## Verdetto Strada B

**Sì: la SPA regge `output: 'export'`.** Condizioni verificate sul build reale:
1. `app/api/*` fuori dal bundle esportato. Serve la Fase 2: 12 route CRUD → supabase-js,
   `import-pdf` → Edge Function, 3 route morte eliminate.
2. Tolto `export const dynamic = 'force-dynamic'` da `app/(app)/layout.tsx` (Fase 1).

Nient'altro serve per avere un build statico funzionante: le 4 pagine server sono solo
`redirect()` ed esportano correttamente.

## Output dell'export riuscito (`out/`)

| Voce | Valore |
|---|---|
| Dimensione | 3,1 MB, 248 file |
| Pagine | 18 + `404.html`, layout `trailingSlash: false` (`home.html` + `home/` con i segmenti RSC `.txt`) |
| Font | 42 `.woff2` in `_next/static/media` (self-hosted da `next/font`) → **nessun CDN** a runtime |
| Chiave Anthropic | **0 occorrenze** del valore, 0 occorrenze `sk-ant` ✅ (la stringa `ANTHROPIC_API_KEY` compare solo in un messaggio d'errore UI di `schede/archivio`, da aggiornare in Fase 2) |
| Supabase URL + anon key | presenti in 1 chunk — atteso (pubbliche per design; la guardia è la RLS) |
| `/api` | assente |
| Redirect (`/`, `/anno`, `/mese`, `/settimana`) | codificati come digest RSC `NEXT_REDIRECT;replace;/home;307;` → redirect **solo client-side** dopo l'hydration (nessun `<meta refresh>`) |

## Rischi runtime emersi (fuori dal perimetro del build, da provare nel guscio)

- **Router Capacitor iOS** (`node_modules/@capacitor/ios/.../Router.swift`): ogni path senza
  estensione viene servito come `/index.html` della root. La navigazione interna è client-side
  (scarica i `.txt` RSC, che hanno estensione) e quindi funziona. Un **reload completo** su una rotta
  (es. iOS che ricarica la WebView dopo un memory-kill) riparte invece dalla root: `/` → redirect
  `/home`, e si perde la rotta corrente (es. `/live/workout`).
  Mitigazione: override di `CAPBridgeViewController.router()` (è `open`) con un router che mappa
  `/x` → `/x.html`. Da validare in Fase 4. Equivalente Android da verificare.
- **Auth redirect**: `resetPasswordForEmail` usa `window.location.origin` → nel guscio diventa
  `capacitor://localhost`. Serve un deep link o lasciare il reset al web (Fase 4).

## Stima impatto su Fasi 1–2

- **Fase 1 (export):** minima. 1 riga nel layout + `next.config` (eventuale `trailingSlash`) +
  script di build separati web/nativo. Nessuna dynamic route di pagina da parametrizzare
  (le `[id]` sono solo nelle API) e nessuna pagina da rifattorizzare.
- **Fase 2 (data layer):**
  - 12 route CRUD (~520 righe) → un modulo dati client su supabase-js, con le funzioni di shaping
    (`shapeWorkout`, albero schede/blocchi FIX6, mapping `es_nome`);
  - 22 call site in 6 file da riallacciare, tutti dietro `apiFetch` in `AppProvider`;
    il grosso (12) sta in `schede/archivio`;
  - `duplica` → RPC atomica consigliata;
  - `import-pdf` (~245 righe) → Edge Function Deno con la chiave come secret;
  - eliminare `config`, `config/key`, `motivation`, `server.js` e le dipendenze legacy.
  - La migrazione è **incrementale e già rilasciabile sul web**: le route restano finché
    l'ultima chiamata non è migrata, poi si eliminano e si accende l'export.
