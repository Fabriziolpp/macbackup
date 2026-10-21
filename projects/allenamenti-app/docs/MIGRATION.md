# Piano di Migrazione: Express + HTML → Next.js + Capacitor

## Obiettivo

Convertire l'app attuale (Express + HTML vanilla) in un'architettura moderna che permetta:

- **Deploy su Vercel** (Next.js nativo)
- **Distribuzione iOS via TestFlight** (Capacitor wrappa la Vercel URL come WebView nativa)
- **Apertura in Xcode** (progetto iOS generato da Capacitor)
- **Variabili d'ambiente in `.env.local`** (non più hardcoded in HTML)

---

## Architettura Target

```
Next.js App (Vercel)
  ├── app/api/...       ← Express endpoints → Next.js API Routes
  ├── app/(app)/...     ← HTML a 5 tab → pagine React
  └── .env.local        ← tutte le variabili d'ambiente

Capacitor (iOS)
  └── WebView → Vercel URL → Xcode → TestFlight
```

---

## Fase 1 — Setup Progetto Next.js

```bash
# Backup dell'app attuale
cp -r . ../allenamenti-app-backup

# Inizializza Next.js nello stesso repo (preserva git history)
npx create-next-app@latest . --typescript --tailwind --app --no-git --yes
```

### Struttura Cartelle

```
app/
  api/
    workouts/
      route.ts                          ← GET, POST
      [id]/route.ts                     ← PUT, DELETE
    schede/
      route.ts                          ← GET, POST
      [id]/
        route.ts                        ← PUT, DELETE
        duplica/route.ts                ← POST
        tipi/
          route.ts                      ← POST
          [tipoId]/
            route.ts                    ← PUT, DELETE
            reorder/route.ts            ← PUT
            esercizi/
              route.ts                  ← POST
              [esId]/route.ts           ← PUT, DELETE
    weight-logs/
      route.ts                          ← GET, POST
      [id]/route.ts                     ← DELETE
    config/
      route.ts                          ← GET, POST
      key/route.ts                      ← DELETE
    import-pdf/route.ts                 ← POST
  (auth)/
    login/page.tsx
  (app)/
    layout.tsx                          ← nav + auth guard
    home/page.tsx
    settimana/page.tsx
    mese/page.tsx
    anno/page.tsx
    schede/page.tsx
  layout.tsx
  page.tsx                              ← redirect → /home o /login
components/
  Nav.tsx
  modals/
    SchedaModal.tsx
    TipoModal.tsx
    EsercizioModal.tsx
    StoricoPesiModal.tsx
    ConfirmModal.tsx
    WarnModal.tsx
lib/
  supabase.ts                           ← client pubblico (NEXT_PUBLIC_)
  supabase-server.ts                    ← client service role (server-only)
  auth.ts                               ← helper requireAuth
docs/
  MIGRATION.md                          ← questo file
```

---

## Fase 2 — Variabili d'Ambiente

Creare `.env.local` (non va mai committato su git):

```env
# ── Pubbliche ── usate nel frontend React (prefisso NEXT_PUBLIC_ obbligatorio)
NEXT_PUBLIC_SUPABASE_URL=https://lzwyhokkvzxlnubsenmf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── Private ── solo API routes server-side, mai esposte al client
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Dove trovare i valori:**
| Variabile | Fonte attuale |
|-----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `public/index.html` riga 523 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `public/index.html` riga 524 |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` attuale |
| `ANTHROPIC_API_KEY` | `.env` attuale |

Aggiungere `.env.local` al `.gitignore`.

> La chiave Anthropic non è più gestibile dall'UI dell'app — vive solo in `.env.local` localmente e nelle variabili d'ambiente del dashboard Vercel in produzione.

---

## Fase 3 — Migrazione API Routes

Ogni endpoint Express diventa un file `route.ts` in Next.js App Router.

### Mapping Completo

| Express (server.js) | Next.js App Router |
|---------------------|--------------------|
| `GET /api/workouts` | `app/api/workouts/route.ts` → `GET` |
| `POST /api/workouts` | `app/api/workouts/route.ts` → `POST` |
| `PUT /api/workouts/:id` | `app/api/workouts/[id]/route.ts` → `PUT` |
| `DELETE /api/workouts/:id` | `app/api/workouts/[id]/route.ts` → `DELETE` |
| `GET /api/schede` | `app/api/schede/route.ts` → `GET` |
| `POST /api/schede` | `app/api/schede/route.ts` → `POST` |
| `PUT /api/schede/:id` | `app/api/schede/[id]/route.ts` → `PUT` |
| `DELETE /api/schede/:id` | `app/api/schede/[id]/route.ts` → `DELETE` |
| `POST /api/schede/:id/duplica` | `app/api/schede/[id]/duplica/route.ts` → `POST` |
| `POST /api/schede/:id/tipi` | `app/api/schede/[id]/tipi/route.ts` → `POST` |
| `PUT /api/schede/:id/tipi/:tipoId` | `app/api/schede/[id]/tipi/[tipoId]/route.ts` → `PUT` |
| `DELETE /api/schede/:id/tipi/:tipoId` | `app/api/schede/[id]/tipi/[tipoId]/route.ts` → `DELETE` |
| `PUT .../reorder` | `app/api/schede/[id]/tipi/[tipoId]/reorder/route.ts` → `PUT` |
| `POST .../esercizi` | `app/api/schede/[id]/tipi/[tipoId]/esercizi/route.ts` → `POST` |
| `PUT .../esercizi/:esId` | `app/api/schede/[id]/tipi/[tipoId]/esercizi/[esId]/route.ts` → `PUT` |
| `DELETE .../esercizi/:esId` | `app/api/schede/[id]/tipi/[tipoId]/esercizi/[esId]/route.ts` → `DELETE` |
| `GET /api/weight-logs` | `app/api/weight-logs/route.ts` → `GET` |
| `POST /api/weight-logs` | `app/api/weight-logs/route.ts` → `POST` |
| `DELETE /api/weight-logs/:id` | `app/api/weight-logs/[id]/route.ts` → `DELETE` |
| `GET /api/config` | `app/api/config/route.ts` → `GET` |
| `POST /api/config` | `app/api/config/route.ts` → `POST` |
| `DELETE /api/config/key` | `app/api/config/key/route.ts` → `DELETE` |
| `POST /api/import-pdf` | `app/api/import-pdf/route.ts` → `POST` |

### Pattern Auth (sostituisce middleware Express)

```typescript
// lib/auth.ts
import { createClient } from '@supabase/supabase-js';

export async function requireAuth(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized');
  // Client con JWT utente → RLS applicata automaticamente
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  return { user, supabase: userClient };
}
```

### Gestione Upload PDF (sostituisce multer)

```typescript
// app/api/import-pdf/route.ts
export async function POST(request: Request) {
  const { user, supabase } = await requireAuth(request);
  const formData = await request.formData();
  const file = formData.get('pdf') as File;
  const buffer = Buffer.from(await file.arrayBuffer());
  // Il resto della logica è identico a server.js
  const pdfData = await pdfParse(buffer);
  // ... chiamata Anthropic, salvataggio Supabase
}
```

---

## Fase 4 — Migrazione Frontend (HTML → React)

### Librerie

| CDN attuale | npm package |
|-------------|-------------|
| `https://cdn.tailwindcss.com` | già incluso in Next.js |
| `https://cdn.jsdelivr.net/.../chart.js` | `npm install chart.js react-chartjs-2` |
| `https://cdn.jsdelivr.net/.../supabase-js` | `@supabase/supabase-js` (già dipendenza) |

### Mapping Sezioni → Componenti

| Sezione HTML | Componente React |
|--------------|-----------------|
| `#login-page` | `app/(auth)/login/page.tsx` |
| Tab Home | `app/(app)/home/page.tsx` |
| Tab Settimana | `app/(app)/settimana/page.tsx` |
| Tab Mese | `app/(app)/mese/page.tsx` |
| Tab Anno | `app/(app)/anno/page.tsx` |
| Tab Schede | `app/(app)/schede/page.tsx` |
| Nav bar | `components/Nav.tsx` |
| Tutti i modali | `components/modals/` |

### Stato Globale

La logica JS esistente si porta in React usando:
- `useState` / `useEffect` per stato locale
- React Context per stato globale (workouts, schede, weightLogs, authToken)

```typescript
// Variabili globali attuali → Context
let workouts   = []  →  const [workouts, setWorkouts] = useState([])
let schede     = []  →  const [schede, setSchede] = useState([])
let weightLogs = []  →  const [weightLogs, setWeightLogs] = useState([])
let _authToken = null →  gestito da Supabase Auth client
```

### Auth Guard

```typescript
// app/(app)/layout.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AppLayout({ children }) {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
    });
  }, []);
  return <>{children}</>;
}
```

---

## Fase 5 — Capacitor (iOS / Xcode / TestFlight)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init "Allenamenti" "com.fabriziolp.allenamenti" --web-dir=out
npx cap add ios
```

### `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fabriziolp.allenamenti',
  appName: 'Allenamenti',
  server: {
    // Punta alla URL Vercel — app come WebView nativa
    url: 'https://allenamenti-app.vercel.app',
    cleartext: false
  }
};

export default config;
```

> L'app iOS è una WebView della Vercel URL. Richiede connessione internet ma non serve static export.

```bash
npx cap sync ios
npx cap open ios   # Apre Xcode automaticamente
```

In Xcode: **Signing & Capabilities** → seleziona il tuo Team → **Product → Archive → Distribute → TestFlight**.

---

## Fase 6 — Deploy Vercel

```bash
npx vercel --prod
```

Variabili da impostare nel **dashboard Vercel** (Settings → Environment Variables):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

---

## File Modificati/Creati

| File | Azione |
|------|--------|
| `server.js` | Deprecato — logica migrata in `app/api/` |
| `supabaseClient.js` | Sostituito da `lib/supabase.ts` + `lib/supabase-server.ts` |
| `public/index.html` | Sostituito dai componenti React |
| `.env` | Sostituito da `.env.local` |
| `package.json` | Aggiornato con dipendenze Next.js + Capacitor |
| `capacitor.config.ts` | Nuovo |
| `next.config.ts` | Nuovo |
| `docs/MIGRATION.md` | Questo file |

---

## Verifica Finale

- [ ] `npm run dev` → app funziona su `localhost:3000`
- [ ] Login/logout Supabase funziona
- [ ] Tutti gli endpoint API rispondono correttamente
- [ ] Import PDF con AI funziona
- [ ] Dark mode funziona
- [ ] Drag & drop esercizi funziona
- [ ] `npx vercel --prod` → deploy riuscito
- [ ] `npx cap sync ios && npx cap open ios` → progetto si apre in Xcode
- [ ] Build iOS in Xcode senza errori
- [ ] Upload TestFlight riuscito
