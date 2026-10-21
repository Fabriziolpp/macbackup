# AP1 Fase 0 — Findings & next actions

> 2026-10-13, branch `ap1/fase0-spike`. Consolida `ap1-fase0-inventory.md` e
> `ap1-fase0-export-spike.md` (stessa cartella). Spec di riferimento:
> `docs/superpowers/specs/2026-07-21-ap1-mobile-native-design.md`.

**In una riga:** la Strada B è praticabile e più economica del previsto. L'export statico
funziona dopo due soli interventi (togliere `app/api`, togliere 1 riga `force-dynamic`), il
bundle non contiene la chiave Anthropic e lo stesso bundle entra già in iOS e Android via
`cap sync`. Il lavoro vero è la **Fase 2 (data layer)**.

## 1. Assunzioni dello spec: confermate / smentite

| Assunzione (spec) | Esito reale | Impatto |
|---|---|---|
| SPA regge `output:'export'` | ✅ **Confermata**, a 2 condizioni: `app/api` fuori dal bundle (Fase 2) + rimozione di `force-dynamic` da `app/(app)/layout.tsx`. Poi build ok: 18/18 pagine statiche, 3,1 MB | Fase 1 quasi nulla; Fase 2 è il vero gate |
| 14 route thin, 2 con logica | ✅ Numeri confermati (16). Ma **3 route sono codice morto** (`config`, `config/key`, `motivation`: zero chiamanti) | Lavoro reale: **12 CRUD + 1 AI** (`import-pdf`). `duplica` è multi-step non transazionale → RPC |
| 4 pagine non-client a rischio export | ❌ **Smentita**: sono solo `redirect()` ed esportano. Il rischio vero era il layout `(app)` con `force-dynamic` | 1 riga da togliere |
| `public/` vuota (no SW/manifest) | ✅ Confermata | SW/manifest da creare solo per il target **web** (Fase 3); nel guscio nativo gli asset sono già locali |
| iOS scaffoldato, Android assente | ✅ Confermata. iOS su **SPM** (no CocoaPods), nessun `webDir`; Android scaffoldabile **senza** SDK/Java (serve solo `@capacitor/android`) | Fase 4 meccanicamente semplice: `cap sync` del bundle già provato su entrambe |
| Capacitor punta a `server.url` remoto | ✅ Confermata (`https://allenamenti-app.vercel.app`) | rimuovere in Fase 4 |
| CSP webfont Barlow via CDN | ❌ **Smentita**: font via `next/font/google`, self-hosted (42 `.woff2` nell'export) | rischio già chiuso |
| Chiave Anthropic mai nel bundle | ✅ **Verificata sull'export**: 0 occorrenze del valore, 0 `sk-ant` | vincolo rispettato; mantenerlo con la Edge Function |
| RLS come guardia | ✅ RLS attiva su **7/7** tabelle, policy di ownership `ALL` | premessa della Strada B solida. Le route usano già anon key + JWT utente → semantica identica lato client |
| `server.js` residuo pre-Next | ✅ Confermato e **già rotto** (`pdf-parse` non installato) | dismissione a costo zero; elimina `express`/`multer` vulnerabili |
| Auth redirect fragile in WebView | ✅ Confermato: `resetPasswordForEmail(redirectTo = window.location.origin…)` → `capacitor://localhost` nel guscio; solo provider `email`; signup con conferma via email | deep link o reset solo-web (Fase 4) |
| Migrazioni da verificare sul remoto | ⚠️ Schema allineato, ma **storico disallineato**: `live_mode` applicata fuori banda (manca nello storico remoto); versioni locali ≠ remote per `q1_infra`/`fix6` | riallineare lo storico prima delle migration di Fase 2/3 (`assigned_at`, RPC) |

## 2. Bloccanti export e loro fase di soluzione

| Classe (errore reale) | Dove | Fase |
|---|---|---|
| `missing "generateStaticParams()"` | 9 route API con segmento dinamico | **2** (migrazione a supabase-js) |
| `dynamic = "force-static"/revalidate not configured` | 4 route API statiche (`schede`, `workouts`, `weight-logs`, `config`) | **2** |
| `dynamic = "force-dynamic" … cannot be used with "output: export"` | `import-pdf`, `motivation` | **2** (Edge Function / eliminazione) |
| `Page with dynamic = "force-dynamic" couldn't be exported` | `app/(app)/layout.tsx` → 15 pagine | **1** (1 riga) |

Rischi runtime da validare nel guscio (Fase 4), emersi dal codice:
- **Router Capacitor**: i path senza estensione → `/index.html` della root. Un reload completo
  (es. memory-kill di iOS) riporta a `/home` e si perde la rotta corrente.
  Rimedio: router custom via `CAPBridgeViewController.router()`.
- I redirect statici sono **solo client-side**: Next 16 non emette `<meta refresh>`, quindi senza JS
  non si naviga. Accettabile in un'app.

## 3. Prerequisiti di ambiente

| Prerequisito | Stato | Serve per |
|---|---|---|
| Xcode | ✅ 27.0 | build iOS / simulatore (già possibile) |
| Account Apple Developer | da confermare (spec: "in apertura") | TestFlight (Fase 6). **Non** serve per simulatore |
| Android Studio + SDK 36 (+ JDK incluso) | ❌ assenti | build/emulatore Android (Fase 4) |
| Google Play Console | da avviare | beta Android (Fase 6) |
| Supabase CLI | ❌ assente | sviluppo/deploy Edge Function `import-pdf` (Fase 2). Alternativa: deploy via MCP |
| Bump dipendenze | Next 16.2.2 → **≥ 16.3.8** (advisory fino a critical, riguarda **già la prod web**); Capacitor 8.3.1 → **8.5.x** (GHSA-rvm3-566m-v7fv) | sicurezza; Capacitor prima della Fase 4 |

## 4. Ordine consigliato dei piani successivi

0. **Igiene (piccolo, su `main`, indipendente da AP1)**: bump di Next (sicurezza prod) e di
   Capacitor 8.5.x; riallineamento dello storico migration Supabase.
1. **Piano Fase 2 — data layer** (precondizione all'export pulito):
   - modulo dati client su supabase-js al posto di `apiFetch`, una risorsa alla volta,
     rilasciabile sul web a ogni step;
   - `duplica` come RPC atomica;
   - `import-pdf` su Edge Function (chiave come secret);
   - eliminazione di `config`, `config/key`, `motivation` (o rinvio a Q1), `server.js` e delle
     dipendenze legacy.
2. **Piano Fase 1 — export pulito**: via `force-dynamic`, `output:'export'`, script di build;
   decidere l'hosting web (statico su Vercel = un solo build per web e nativo).
3. **Piano Fase 4 (iOS minimo, anticipato)**:
   - via `server.url`, `webDir:'out'`;
   - router custom e deep link per l'auth;
   - smoke test su simulatore/dispositivo.

   Primo build Xcode che contiene davvero l'app. Android segue quando l'ambiente è pronto.
4. **Piano Fase 3 — OFF1** sul target B: cache schede in `idb`, coda idempotente, migration
   `assigned_at`. Testato direttamente nel guscio. Workbox serve solo al target web.
5. **Fase 5** (push OneSignal, haptics, notifiche locali, dettatura) → **Fase 6** (signing, TestFlight, store).

> Rispetto all'ordine "tipico" (2 → 1 → 3 → 4) propongo di **anticipare il guscio iOS minimo
> (punto 3) prima di OFF1**. Costa poco dopo le Fasi 1–2, dà subito un'app nativa vera da
> provare su iPhone e valida presto i rischi runtime (router, auth, storage WKWebView) prima di
> costruirci sopra l'offline. Da confermare con Fabrizio.

### Decisioni da prendere prima di scrivere il piano di Fase 2
1. `duplica`: RPC Postgres atomica (consigliata) o sequenza di insert lato client?
2. `motivation`: eliminarla ora (non usata) o tenerla per Q1?
3. Web dopo l'export: anche la prod Vercel diventa statica (consigliato: un solo target)?
4. Auth nel guscio: reset password via deep link (universal link / custom scheme) o solo dal web?
5. Sessione Supabase nel guscio: `localStorage` del WKWebView o storage `@capacitor/preferences`?
6. `docs/BACKLOG.md` (fonte di verità): registrare le decisioni AP1 del 2026-07-21, l'esito della
   Fase 0 e il nuovo sequencing (Strada B prima di OFF1).

> **Esito (2026-10-13):** decisioni prese e registrate in `docs/BACKLOG.md` (sezione AP1). Il design
> di dettaglio è in `docs/superpowers/specs/2026-10-13-ap1-igiene-fase2-design.md`. Il branch
> `ap1/fase0-spike` è stato eliminato dopo aver portato queste note su `main`.
