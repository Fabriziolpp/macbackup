# Vi.To — Stack tecnologico & analisi passaggio a mobile (AP1)

> **Documento locale, a uso personale.** NON committato, NON pushato, NON tracciato da git.
> Redatto 2026-07-16 come supporto alla progettazione di AP1 (app mobile) e OFF1 (offline).
> Fonte: ispezione diretta del codebase (`package.json`, `capacitor.config.ts`, `next.config.ts`, `app/api/*`, `lib/*`).

---

## 1. Stack a colpo d'occhio

| Layer | Tecnologia | Note per il mobile |
|---|---|---|
| UI | React 19 + Next.js 16 (App Router) | **14/18 pagine `'use client'`** → di fatto una **client SPA**. Ottimo per il porting. |
| State | Zustand 5 (`lib/liveStore.ts`) | client-side, nessun problema |
| Storage locale | **`idb`** 8 (IndexedDB) — `lib/idb.ts` | già usato per `ActiveSession` + coda pending-workout |
| Styling | Tailwind 4 + design tokens inline `--gt-*` | font Barlow/Barlow Condensed (attenzione CSP webfont) |
| Grafici | Chart.js + react-chartjs-2 | client-side |
| Animazioni | framer-motion | client-side |
| **Backend dati** | **Supabase** (Postgres + Auth + RLS) — ref `lzwyhokkvzxlnubsenmf` | il vero backend; auth JWT |
| **API** | 16 Next route handlers (`app/api/*`) | **il punto da sciogliere** (vedi §4) |
| AI | Anthropic SDK | import PDF schede + messaggi motivazionali |
| Deploy web | Vercel (`vercel.json`) | |
| **Native** | **Capacitor 8** — iOS scaffoldato (`ios/App`), **Android assente** | vedi §3 |
| Legacy | `server.js` (Express, script `start:express`) + `config.json` | backend pre-Next, parallelo; probabilmente dismettibile |

---

## 2. Come è servita oggi

- **Web:** Next.js su Vercel (`allenamenti-app.vercel.app`). SSR/route handlers girano lato server Vercel.
- **App "nativa":** Capacitor iOS che **carica la URL remota** (vedi §3). Non c'è un bundle statico dentro l'app.
- **Dati:** il client chiama le 16 route Next (`/api/*`), che a loro volta parlano con Supabase applicando la RLS con il JWT dell'utente (`lib/auth.ts` → `requireAuth`).

---

## 3. Il nodo centrale: la WebView remota

`capacitor.config.ts`:
```ts
const config: CapacitorConfig = {
  appId: 'com.fabriziolp.allenamenti',
  appName: 'Allenamenti',
  server: { url: 'https://allenamenti-app.vercel.app', cleartext: false }
};
```

L'app iOS **non contiene l'app**: è un guscio che apre il sito Vercel in WebView. Implicazioni:

- 🟥 **Online-obbligatorio.** Una WebView remota non può girare offline → **incompatibile con OFF1** (Live offline-first, prio 1).
- 🟥 **Rischio App Store.** I wrapper "solo un sito web" possono cadere sotto Apple Guideline 4.2 (minimum functionality).
- 🟨 **Nessun bundle statico.** `next.config.ts` è vuoto (niente `output: 'export'`).
- 🟨 **Nessun PWA layer.** `public/` è vuota: niente `manifest`, niente service worker / **Workbox** (quindi il "Workbox esistente" citato nella spec OFF1 §4.5 **è da creare da zero**).

➡️ **Per una vera app (e per l'offline di OFF1), gli asset vanno impacchettati nell'app e il client deve parlare direttamente con Supabase**, non caricare Vercel in webview.

---

## 4. Le 16 route API: cosa migra e come

Auth comune: `requireAuth` (JWT bearer) + `supabase.from(...)` con RLS.

**Gruppo A — CRUD thin-wrapper (14 route): sostituibili con `supabase-js` diretto dal client.**
La RLS già protegge i dati, quindi il client autenticato può fare le stesse query senza passare da un server.
- `schede` (+ `[id]`, `duplica`, `tipi`, `tipi/[tipoId]`, `esercizi`, `esercizi/[esId]`, `reorder`)
- `workouts` (+ `[id]`)
- `weight-logs` (+ `[id]`)
- `config`, `config/key` (valutare: la key non deve stare client-side — vedi gruppo B)

**Gruppo B — logica server-only (2 route): richiedono un endpoint serverless.**
Usano la **chiave Anthropic**, che NON può essere spedita nell'app.
- `import-pdf` (Anthropic + parsing PDF)
- `motivation` (Anthropic)
➡️ da spostare su **Supabase Edge Function** (coerente con Supabase-centric) **oppure** tenere una piccola **Vercel fn** chiamata via rete.

> Convergenza: **MNGMT1** introduce già **RPC Postgres `SECURITY DEFINER`**; **OFF1** vuole **idempotenza lato RPC**. Tutti e tre spingono verso lo stesso target: **client ↔ Supabase diretto + RPC/Edge**, con Vercel ridotto al solo pezzo AI.

---

## 5. Due strade per AP1

### Strada A — WebView remota (stato attuale)
- **Pro:** zero rework; SSR e route "gratis"; deploy unico.
- **Contro:** online-only (**annulla OFF1**), rischio store, non è una "vera app", nessun accesso nativo reale.
- **Verdetto:** utile solo come **ponte temporaneo**, non come destinazione.

### Strada B — Bundle statico + Supabase diretto  ✅ raccomandata
1. `next.config` → `output: 'export'` (o build client servita da Capacitor da asset locali).
2. 14 route CRUD → chiamate `supabase-js` dirette (RLS come guardia).
3. `import-pdf` / `motivation` → **Edge Function** (o Vercel fn).
4. Aggiungere **Workbox** (app-shell offline) + il layer offline di OFF1 (cache schede + coda idempotente).
5. Capacitor: rimuovere `server.url`, servire gli asset locali.
- **Pro:** vera app, **offline reale**, store-friendly, accesso nativo (push, haptics, dettatura per F7).
- **Contro:** rework — ma **la UI è già client SPA**, quindi il grosso è (a) spostare le route e (b) cambiare build/target.

---

## 6. Sequenza consigliata (il punto strategico)

OFF1 (prio 1) presuppone il modello **"bundle + Supabase diretto"** della Strada B: fare l'offline sopra la WebView remota è impossibile.

➡️ **Decidere l'architettura target di AP1 PRIMA di implementare OFF1**, anche se AP1 è formalmente "secondaria". Altrimenti si rischia di:
- fare l'offline due volte (una per il web PWA, una per il nativo), oppure
- costruire OFF1 su un'assunzione (WebView remota) che va buttata.

**Ordine pragmatico proposto:**
1. **Decisione architetturale AP1** (Strada B) — target: static export + Supabase diretto + Edge Function AI.
2. **OFF1** costruito già sul target B (cache schede in IDB + coda idempotente + Workbox app-shell).
3. **MNGMT1** (RPC/ruoli) — già allineato al target Supabase-centric.
4. **AP1 packaging** vero (build iOS/Android, store) quando il web-target B è solido.

---

## 7. Domande aperte da decidere

1. **iOS-only prima, o iOS + Android?** (oggi solo iOS scaffoldato; Android da aggiungere)
2. **Route CRUD:** eliminarle del tutto (client → Supabase) o tenerle come fallback web?
3. **AI (import-pdf/motivation):** Edge Function Supabase o Vercel fn?
4. **`server.js` legacy (Express):** dismetterlo? (sembra un residuo pre-Next)
5. **Static export vs webview locale:** `output: 'export'` puro o Capacitor che serve una build client?
6. **Push (R3) e dettatura (F7):** confermare che arrivano con AP1 (native) o via OneSignal.

---

## 8. Rischi / gotcha noti

- **Webfont CSP:** Barlow via CDN è bloccato in alcuni contesti → inline `@font-face` data-URI o font di sistema.
- **`idb` vs Dexie:** la spec OFF1 dice Dexie, il progetto usa `idb` → restare su `idb` (già deciso in nota memoria `off1-implementation-notes`).
- **Migrazioni Supabase:** lezione q1_infra — applicare **e verificare sul remoto** ogni ALTER (`assigned_at` per OFF1, tabelle MNGMT1).
- **Chiave Anthropic:** non deve mai finire nel bundle nativo.
- **Deep-link / auth redirect:** il flusso Supabase Auth via redirect va verificato in WebView nativa (INV1 `?ref=` ha già questa fragilità documentata).

---

*Fine. Documento personale, non versionato.*
