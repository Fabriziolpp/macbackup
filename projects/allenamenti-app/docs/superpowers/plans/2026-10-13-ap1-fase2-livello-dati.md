# AP1 Fase 2 — Livello dati diretto: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Chi esegue cosa** (spec §3.2 e §6):
> - **Sessione:** Task 1–6, 10–12 e 15–16. Toccano la produzione (migration, deploy, test sul DB) oppure fissano le convenzioni.
> - **Subagent, ognuno in un worktree separato sotto `.claude/worktrees/`:**
>   - Task 7–8 (2B), branch `ap1/2b-schede`;
>   - Task 9 (2D), branch `ap1/2d-weightlogs`;
>   - Task 13–14 (2C), branch `ap1/2c-import-pdf`.
>
>   I subagent scrivono codice, SQL e test, e verificano solo con `npx tsc --noEmit` e `npm test`. Non eseguono `test:db`, migration o deploy.
>
> **Parallelismo:** dopo il Task 6 si lanciano insieme 2B (Task 7–8) e 2D (Task 9); intanto in sessione si fanno i Task 11–12 (spike). I Task 13–14 (2C) partono dopo la decisione di Fabrizio sullo spike.
>
> **Prerequisito:** il passo 0 (Task 1) parte solo quando Fabrizio avvisa che gli utenti di test sono pronti.

**Goal:** sostituire le route di `app/api` con un livello dati tipizzato che parla direttamente con Supabase (la RLS fa da guardia) e portare `import-pdf` su una Edge Function, rilasciando a piccoli passi (push P1–P4).

**Architecture:**
- `lib/data/` espone `createDataApi(db)`; l'app usa l'istanza `dataApi`, legata al client del browser.
- Ogni risorsa ha un modulo con i mapping puri e le API, che replicano la route corrispondente. Le route restano online finché l'ultima chiamata non è migrata.
- Correzione RLS e RPC `duplica_scheda` arrivano tramite migration.
- `import-pdf` diventa una Edge Function Deno con un limite per utente, tracciato nella tabella `ai_usage`.

**Tech Stack:** Next.js 16.3.8, TypeScript 6, supabase-js 2.99.2, Vitest 5.0.2, Supabase (Postgres + RLS, Edge Functions Deno), strumenti MCP Supabase (`apply_migration`, `list_migrations`, `execute_sql`, `generate_typescript_types`, `deploy_edge_function`, `get_advisors`).

**Spec:** `docs/superpowers/specs/2026-10-13-ap1-igiene-fase2-design.md`. Prerequisito: piano P0 (`docs/superpowers/plans/2026-10-13-ap1-p0-igiene.md`) completato e pubblicato.

## Global Constraints

- **Produzione**: l'unico progetto Supabase è `lzwyhokkvzxlnubsenmf`. Migration, deploy della Edge Function, `execute_sql` e i test sul DB (`npm run test:db`, `npm run test:rls`) si fanno **solo in sessione**, mai dai subagent.
- **Migration**:
  - quelle additive (`duplica_scheda`, `ai_usage`) le applica la sessione;
  - quella che cambia le policy (Task 2) si mostra prima a Fabrizio, insieme ai conteggi, e si applica dopo il suo ok;
  - dopo ogni `apply_migration` si legge la versione con `list_migrations`, si rinomina il file `pending_<nome>.sql` in `<versione>_<nome>.sql` e, se lo schema è cambiato, si rigenera `lib/data/db.types.ts`.
- **Dati reali**: niente DROP, DELETE o UPDATE. I test cancellano solo righe marcate `[rls-test]` degli utenti di test, dopo averne verificato la proprietà (`cleanupMarked`).
- **Segreti**:
  - mai la service role key, né nel client né nei test;
  - mai leggere o stampare chiavi, token o password: `.env.local` si carica solo dentro i processi di test (`process.loadEnvFile`, `node --env-file`);
  - il secret `ANTHROPIC_API_KEY_EDGE` lo imposta Fabrizio.
- **Comportamento**: identico alle route (spec §5.4). Le uniche eccezioni sono il toast d'errore dove oggi gli errori sono ignorati e la duplica che copia tutti i campi.
- **Id**: si generano lato client con `newId()` di `lib/utils.ts`.
- **Limite import**: costante unica `IMPORT_PDF_DAILY_LIMIT = 10`, in `supabase/functions/import-pdf/config.ts`.
- **Cancello prima di ogni push**:
  1. `npx tsc --noEmit`
  2. `npm run build`
  3. `npm test`
  4. `npm run test:db`
  5. la prova manuale di Fabrizio, su `npm start` in locale.

  Il push lo fa la sessione dopo l'«ok Pn» di Fabrizio.
- **Da non committare**: `next-env.d.ts` e `.claude/settings.local.json`.
- **Commit**: in italiano, chiusi da `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Prerequisiti (Fabrizio)

- **Prima del Task 1**:
  - due utenti di test, creati dal dashboard Supabase (Authentication → Add user, con «Auto Confirm User»);
  - le credenziali in `.env.local`: `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_USER_2_EMAIL`, `TEST_USER_2_PASSWORD`;
  - una scheda sull'utente 1, con almeno un blocco AMRAP.
- **Prima del Task 12**:
  - il secret `ANTHROPIC_API_KEY_EDGE` (Dashboard → Edge Functions → Secrets);
  - un limite di spesa sulla console Anthropic;
  - i percorsi di 1–2 PDF reali, compreso il più pesante.

## Mappa dei file

| File | Responsabilità | Task |
|---|---|---|
| `vitest.config.ts` | test unit (senza rete) | 1 |
| `vitest.db.config.ts`, `tests/db/setup.ts`, `tests/db/helpers.ts` | test sul DB di produzione con gli utenti di test | 1 |
| `tests/db/rls.test.ts` | isolamento RLS (suite `test:rls`) | 1, 6, 11, 15 |
| `docs/superpowers/notes/rls-audit.md` | audit RLS condiviso con MNGMT1 | 2, 16 |
| `supabase/migrations/<v>_rls_riferimenti.sql` | policy che controllano i riferimenti | 2 |
| `lib/data/db.types.ts` | tipi generati dallo schema | 3, 6, 11 |
| `lib/data/types.ts` | tipi di dominio, input e risultati | 3 |
| `lib/data/errors.ts` (+test) | `DataError` e conversioni | 3 |
| `lib/data/session.ts` | tipo `Db` e `requireUserId` | 3 |
| `lib/data/workouts.ts` (+test) | mapping e API workouts | 4 |
| `lib/data/index.ts` | `createDataApi`, `dataApi` | 4, 7, 9, 14 |
| `tests/db/parity/*.test.ts` | parità con le vecchie route (temporanei) | 4, 7, 9 |
| `supabase/migrations/<v>_duplica_scheda.sql`, `tests/db/duplica.test.ts` | RPC di duplica e suo test | 6 |
| `lib/data/schede.ts` (+test) | mapping e API schede | 7 |
| `lib/data/weightLogs.ts` (+test) | mapping e API weight-logs | 9 |
| `supabase/migrations/<v>_ai_usage.sql` | contatore per il limite import | 11 |
| `supabase/functions/import-pdf/{index,config,prompt,core}.ts`, `core.test.ts` | Edge Function | 12, 13 |
| `scripts/spike-import-pdf.mjs`, `docs/superpowers/notes/ap1-spike-import-pdf.md` | spike e suo esito | 12 |
| `lib/data/importPdf.ts` (+test) | client della Edge Function | 14 |
| `tests/db/importPdf.test.ts` | test funzionale import (opt-in) | 15 |
| Call site: `providers/AppProvider.tsx`, `app/(app)/home/page.tsx`, `app/(app)/live/summary/page.tsx`, `app/(app)/AppLayoutClient.tsx`, `app/(app)/schede/archivio/page.tsx`, `components/modals/StoricoPesiModal.tsx` | da `apiFetch` a `dataApi` | 5, 8, 9, 15, 16 |

---

## Passo 0 — Test e RLS (sessione)

### Task 1: Vitest e suite RLS

**Esecuzione:** sessione.

**Files:**
- Modify: `package.json` (devDependency `vitest`, script `test`, `test:rls`, `test:db`)
- Create: `vitest.config.ts`, `vitest.db.config.ts`, `tests/db/setup.ts`, `tests/db/helpers.ts`, `tests/db/rls.test.ts`

**Interfaces:**
- Produces:
  - in `tests/db/helpers.ts`:
    - `MARK = '[rls-test]'`, `type TestDb = SupabaseClient`;
    - `interface TestUser { db: TestDb; id: string; token: string }`;
    - `interface Tree { schedaId; tipoId; bloccoId; esercizioId; exerciseId; workoutId; weightLogId }` (tutte `string`);
    - le funzioni `anonClient(): TestDb`, `signIn(which: 1 | 2): Promise<TestUser>`, `tid(): string`, `createTree(u: TestUser): Promise<Tree>`, `cleanupMarked(users: TestUser[]): Promise<void>`;
  - gli script npm `test`, `test:rls` e `test:db`.

- [ ] **Step 1: Installa Vitest**

Run: `npm install -D vitest@5.0.2`
Expected: `package.json` ha `"vitest": "^5.0.2"` in `devDependencies`. Se l'installazione o la configurazione falliscono con la 5.0.2, ripiegare su `vitest@4.1.11` e annotarlo nel commit.

- [ ] **Step 2: Script npm**

Il blocco `scripts` di `package.json` diventa:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:rls": "vitest run -c vitest.db.config.ts tests/db/rls.test.ts",
    "test:db": "vitest run -c vitest.db.config.ts"
  },
```

- [ ] **Step 3: Configurazione dei test unit**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Test unit: niente rete, niente database. I test sul DB stanno in vitest.db.config.ts.
const root = fileURLToPath(new URL('.', import.meta.url)); // termina con '/'

export default defineConfig({
  resolve: { alias: [{ find: /^@\//, replacement: root }] },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
    passWithNoTests: true,
  },
});
```

- [ ] **Step 4: Configurazione dei test sul DB**

Create `vitest.db.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Test sul database di produzione con i due utenti di test (mai service role).
// Si eseguono solo in sessione: npm run test:rls / npm run test:db.
const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: { alias: [{ find: /^@\//, replacement: root }] },
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    setupFiles: ['tests/db/setup.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
```

Create `tests/db/setup.ts`:

```ts
// Carica .env.local nel processo dei test (Node ≥ 20.12) senza stamparne i valori,
// e verifica che ci sia tutto il necessario.
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'TEST_USER_EMAIL',
  'TEST_USER_PASSWORD',
  'TEST_USER_2_EMAIL',
  'TEST_USER_2_PASSWORD',
];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  throw new Error(`Variabili mancanti in .env.local: ${missing.join(', ')}`);
}
```

- [ ] **Step 5: Helper dei test sul DB**

Create `tests/db/helpers.ts`:

```ts
// Helper dei test sul database di produzione (AP1 Fase 2).
// Regole: solo chiave anon + sessione degli utenti di test (mai service role);
// si cancellano solo righe marcate [rls-test] dopo averne verificato la proprietà.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Client volutamente non tipizzato: i test usano nomi di tabella dinamici.
export type TestDb = SupabaseClient;

export const MARK = '[rls-test]';

export interface TestUser {
  db: TestDb;
  id: string;
  token: string;
}

export interface Tree {
  schedaId: string;
  tipoId: string;
  bloccoId: string;
  esercizioId: string;
  exerciseId: string;
  workoutId: string;
  weightLogId: string;
}

export function anonClient(): TestDb {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signIn(which: 1 | 2): Promise<TestUser> {
  const email = which === 1 ? process.env.TEST_USER_EMAIL! : process.env.TEST_USER_2_EMAIL!;
  const password = which === 1 ? process.env.TEST_USER_PASSWORD! : process.env.TEST_USER_2_PASSWORD!;
  const db = anonClient();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Login dell'utente di test ${which} non riuscito: ${error?.message ?? 'sessione assente'}`);
  }
  return { db, id: data.session.user.id, token: data.session.access_token };
}

/** Id testuale univoco per le fixture (le tabelle usano id text generati dal client). */
export function tid(): string {
  return `rlst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`fixture ${what}: ${error.message}`);
  return data;
}

/** Albero completo di proprietà di `u`, marcato [rls-test]. */
export async function createTree(u: TestUser): Promise<Tree> {
  const t = {
    schedaId: tid(), tipoId: tid(), bloccoId: tid(), esercizioId: tid(), workoutId: tid(), weightLogId: tid(),
  };
  await must(u.db.from('schede').insert({ id: t.schedaId, nome: `${MARK} scheda`, mese: '', user_id: u.id }), 'schede');
  await must(u.db.from('tipi').insert({ id: t.tipoId, scheda_id: t.schedaId, nome: `${MARK} tipo`, ordine: 0, user_id: u.id }), 'tipi');
  await must(u.db.from('blocchi').insert({
    id: t.bloccoId, tipo_id: t.tipoId, ordine: 0, tipo: 'circuito_amrap', durata_minuti: 10, nota_comune: MARK, user_id: u.id,
  }), 'blocchi');
  const ex = await must(u.db.from('exercises').insert({ name: `${MARK} exercise`, user_id: u.id }).select('id').single(), 'exercises');
  if (!ex) throw new Error('fixture exercises: nessuna riga restituita');
  await must(u.db.from('esercizi').insert({
    id: t.esercizioId, tipo_id: t.tipoId, blocco_id: t.bloccoId, titolo: `${MARK} esercizio`, ordine: 0, exercise_id: ex.id, user_id: u.id,
  }), 'esercizi');
  await must(u.db.from('workouts').insert({ id: t.workoutId, data: '2026-01-01', note: `${MARK} workout`, user_id: u.id }), 'workouts');
  await must(u.db.from('weight_logs').insert({ id: t.weightLogId, date: '2026-01-01', es_nome: `${MARK} peso`, user_id: u.id }), 'weight_logs');
  return { ...t, exerciseId: ex.id };
}

// Prima le schede: la cascata elimina tipi, blocchi ed esercizi, che possono puntare agli exercises.
const MARKED: Array<{ table: string; column: string }> = [
  { table: 'schede', column: 'nome' },
  { table: 'exercises', column: 'name' },
  { table: 'workouts', column: 'note' },
  { table: 'weight_logs', column: 'es_nome' },
];

/**
 * Cancella le righe marcate [rls-test] degli utenti di test. Prima verifica che OGNI riga
 * marcata visibile appartenga a uno di loro: se trova altro si interrompe senza cancellare nulla.
 */
export async function cleanupMarked(users: TestUser[]): Promise<void> {
  const allowed = new Set(users.map(u => u.id));
  const plan: Array<{ u: TestUser; table: string; ids: string[] }> = [];
  for (const { table, column } of MARKED) {
    for (const u of users) {
      const { data, error } = await u.db.from(table).select('id, user_id').like(column, `${MARK}%`);
      if (error) throw new Error(`pulizia: lettura di ${table} non riuscita: ${error.message}`);
      const rows = (data ?? []) as Array<{ id: string; user_id: string | null }>;
      const foreign = rows.filter(r => !r.user_id || !allowed.has(r.user_id));
      if (foreign.length > 0) {
        throw new Error(`pulizia interrotta: ${foreign.length} righe marcate in ${table} non appartengono agli utenti di test`);
      }
      if (rows.length > 0) plan.push({ u, table, ids: rows.map(r => String(r.id)) });
    }
  }
  for (const { u, table, ids } of plan) {
    const { error } = await u.db.from(table).delete().in('id', ids);
    if (error) throw new Error(`pulizia: cancellazione da ${table} non riuscita: ${error.message}`);
  }
}
```

- [ ] **Step 6: Scrivi la suite RLS**

Create `tests/db/rls.test.ts`:

```ts
// Isolamento RLS con due utenti di test (AP1 Fase 2). Si esegue con: npm run test:rls
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anonClient, cleanupMarked, createTree, MARK, signIn, tid, type TestUser, type Tree } from './helpers';

let u1: TestUser;
let u2: TestUser;
let t1: Tree;
let t2: Tree;

beforeAll(async () => {
  u1 = await signIn(1);
  u2 = await signIn(2);
  if (u1.id === u2.id) throw new Error('TEST_USER e TEST_USER_2 devono essere due utenti diversi');
  await cleanupMarked([u1, u2]); // avanzi di run interrotti
  t1 = await createTree(u1);
  t2 = await createTree(u2);
});

afterAll(async () => {
  if (u1 && u2) await cleanupMarked([u1, u2]);
});

const TABLES: Array<{ table: string; key: keyof Tree; patch: Record<string, unknown> }> = [
  { table: 'schede', key: 'schedaId', patch: { mese: 'hack' } },
  { table: 'tipi', key: 'tipoId', patch: { nome: 'hack' } },
  { table: 'blocchi', key: 'bloccoId', patch: { nota_comune: 'hack' } },
  { table: 'esercizi', key: 'esercizioId', patch: { note: 'hack' } },
  { table: 'exercises', key: 'exerciseId', patch: { name: 'hack' } },
  { table: 'workouts', key: 'workoutId', patch: { ora: 'hack' } },
  { table: 'weight_logs', key: 'weightLogId', patch: { carico: 'hack' } },
];

describe("RLS: l'utente 1 non legge né modifica i dati dell'utente 2", () => {
  for (const { table, key, patch } of TABLES) {
    it(`${table}: select per id → nessuna riga`, async () => {
      const { data, error } = await u1.db.from(table).select('id').eq('id', t2[key]);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it(`${table}: update per id → nessuna riga toccata`, async () => {
      const { data, error } = await u1.db.from(table).update(patch).eq('id', t2[key]).select('id');
      expect(error).toBeNull();
      expect(data).toEqual([]);
      const { data: still } = await u2.db.from(table).select('*').eq('id', t2[key]).single();
      expect(JSON.stringify(still)).not.toContain('hack');
    });

    it(`${table}: delete per id → nessuna riga toccata`, async () => {
      const { data, error } = await u1.db.from(table).delete().eq('id', t2[key]).select('id');
      expect(error).toBeNull();
      expect(data).toEqual([]);
      const { data: still } = await u2.db.from(table).select('id').eq('id', t2[key]);
      expect(still).toHaveLength(1);
    });
  }
});

describe("RLS: nessuno scrive a nome di un altro utente", () => {
  const rows: Array<[string, () => Record<string, unknown>]> = [
    ['schede', () => ({ id: tid(), nome: `${MARK} intruso`, mese: '', user_id: u2.id })],
    ['workouts', () => ({ id: tid(), data: '2026-01-01', note: `${MARK} intruso`, user_id: u2.id })],
    ['weight_logs', () => ({ id: tid(), date: '2026-01-01', es_nome: `${MARK} intruso`, user_id: u2.id })],
    ['exercises', () => ({ name: `${MARK} intruso`, user_id: u2.id })],
    ['blocchi', () => ({ id: tid(), tipo_id: t1.tipoId, tipo: 'circuito_amrap', nota_comune: MARK, user_id: u2.id })],
  ];
  for (const [table, row] of rows) {
    it(`${table}: insert con user_id dell'utente 2 → rifiutato`, async () => {
      const { error } = await u1.db.from(table).insert(row());
      expect(error?.code).toBe('42501');
    });
  }
});

describe("RLS: nessuno aggancia righe all'albero di un altro utente", () => {
  it("tipo nella scheda dell'utente 2 → rifiutato", async () => {
    const { error } = await u1.db.from('tipi').insert({ id: tid(), scheda_id: t2.schedaId, nome: MARK, ordine: 0, user_id: u1.id });
    expect(error?.code).toBe('42501');
  });

  it("esercizio nel tipo dell'utente 2 → rifiutato", async () => {
    const { error } = await u1.db.from('esercizi').insert({ id: tid(), tipo_id: t2.tipoId, titolo: MARK, user_id: u1.id });
    expect(error?.code).toBe('42501');
  });

  it("spostare un proprio tipo nella scheda dell'utente 2 → rifiutato", async () => {
    const { error } = await u1.db.from('tipi').update({ scheda_id: t2.schedaId }).eq('id', t1.tipoId);
    expect(error?.code).toBe('42501');
  });

  // I casi seguenti oggi PASSANO l'insert (buchi §7.2 della spec): si correggono nel Task 2.
  it("blocco nel tipo dell'utente 2 → rifiutato", async () => {
    const { error } = await u1.db.from('blocchi').insert({ id: tid(), tipo_id: t2.tipoId, tipo: 'circuito_amrap', nota_comune: MARK, user_id: u1.id });
    expect(error?.code).toBe('42501');
  });

  it("esercizio con blocco_id dell'utente 2 → rifiutato", async () => {
    const { error } = await u1.db.from('esercizi').insert({ id: tid(), tipo_id: t1.tipoId, blocco_id: t2.bloccoId, titolo: MARK, user_id: u1.id });
    expect(error?.code).toBe('42501');
  });

  it("esercizio con exercise_id dell'utente 2 (SEC1) → rifiutato", async () => {
    const { error } = await u1.db.from('esercizi').insert({ id: tid(), tipo_id: t1.tipoId, exercise_id: t2.exerciseId, titolo: MARK, user_id: u1.id });
    expect(error?.code).toBe('42501');
  });

  // Valgono solo se la migration del Task 2 include il controllo su user_id (conteggi (d)/(e) = 0).
  it("tipo nella propria scheda ma con user_id dell'utente 2 → rifiutato", async () => {
    const { error } = await u1.db.from('tipi').insert({ id: tid(), scheda_id: t1.schedaId, nome: MARK, ordine: 9, user_id: u2.id });
    expect(error?.code).toBe('42501');
  });

  it("esercizio nel proprio tipo ma con user_id dell'utente 2 → rifiutato", async () => {
    const { error } = await u1.db.from('esercizi').insert({ id: tid(), tipo_id: t1.tipoId, titolo: MARK, user_id: u2.id });
    expect(error?.code).toBe('42501');
  });
});

describe('RLS: utente anonimo', () => {
  for (const table of ['schede', 'tipi', 'blocchi', 'esercizi', 'exercises', 'workouts', 'weight_logs']) {
    it(`${table}: select → nessuna riga`, async () => {
      const { data, error } = await anonClient().from(table).select('id').limit(1);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  }

  it('schede: insert → rifiutato', async () => {
    const { error } = await anonClient().from('schede').insert({ id: tid(), nome: `${MARK} anon`, mese: '' });
    expect(error?.code).toBe('42501');
  });
});
```

- [ ] **Step 7: Esegui la suite e annota l'esito**

Run: `npm run test:rls`
Expected: FAIL. Falliscono **esattamente** questi 5 test, e tutti gli altri passano:
1. `blocco nel tipo dell'utente 2 → rifiutato`
2. `esercizio con blocco_id dell'utente 2 → rifiutato`
3. `esercizio con exercise_id dell'utente 2 (SEC1) → rifiutato`
4. `tipo nella propria scheda ma con user_id dell'utente 2 → rifiutato`
5. `esercizio nel proprio tipo ma con user_id dell'utente 2 → rifiutato`

Annota l'elenco: va nell'audit (Task 2). Se fallisce altro, fermarsi e capire perché prima di proseguire.

Run: `npm test`
Expected: `No test files found` con exit 0 (grazie a `passWithNoTests`).

Run: `npx tsc --noEmit`
Expected: nessun output.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.db.config.ts tests/db
git commit -F - <<'EOF'
test(ap1): Vitest e suite RLS con due utenti di test

- npm test (unit), npm run test:rls e npm run test:db (DB di produzione,
  solo chiave anon + utenti di test)
- pulizia delle fixture [rls-test] con verifica di proprietà prima di
  cancellare: si interrompe se trova righe di altri
- 5 casi oggi falliscono (blocchi/esercizi agganciabili all'albero altrui,
  user_id non verificato su tipi/esercizi): si correggono nel prossimo commit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Audit RLS e correzione delle policy

**Esecuzione:** sessione. Richiede l'ok di Fabrizio prima dell'`apply_migration`.

**Files:**
- Create: `docs/superpowers/notes/rls-audit.md`
- Create: `supabase/migrations/pending_rls_riferimenti.sql`, da rinominare in `<versione>_rls_riferimenti.sql` (Step 6)

**Interfaces:**
- Consumes: `npm run test:rls` (Task 1).
- Produces: policy di `blocchi`, `esercizi` e `tipi` che verificano i riferimenti; l'audit come documento di riferimento comune con MNGMT1.

- [ ] **Step 1: Conteggi delle righe che violerebbero le nuove regole (sola lettura)**

Prima esegui `npm run test:rls`, così l'`afterAll` cancella le fixture e i conteggi non le includono.

Poi esegui il tool MCP `execute_sql` (`project_id: "lzwyhokkvzxlnubsenmf"`):

```sql
select
  (select count(*) from public.blocchi b
     join public.tipi t on t.id = b.tipo_id
     join public.schede s on s.id = t.scheda_id
   where b.user_id is distinct from s.user_id) as a_blocchi_tipo_altrui,
  (select count(*) from public.esercizi e
     join public.tipi t on t.id = e.tipo_id
     join public.schede s on s.id = t.scheda_id
     join public.blocchi b on b.id = e.blocco_id
   where b.user_id is distinct from s.user_id) as b_esercizi_blocco_altrui,
  (select count(*) from public.esercizi e
     join public.tipi t on t.id = e.tipo_id
     join public.schede s on s.id = t.scheda_id
     join public.exercises x on x.id = e.exercise_id
   where x.user_id is distinct from s.user_id) as c_esercizi_exercise_altrui,
  (select count(*) from public.tipi t
     join public.schede s on s.id = t.scheda_id
   where t.user_id is distinct from s.user_id) as d_tipi_user_id,
  (select count(*) from public.esercizi e
     join public.tipi t on t.id = e.tipo_id
     join public.schede s on s.id = t.scheda_id
   where e.user_id is distinct from s.user_id) as e_esercizi_user_id;
```

Expected: una riga con 5 conteggi; ci si aspetta 0 ovunque.
- Se (a), (b) o (c) sono maggiori di zero: fermarsi e riportarlo a Fabrizio. Ci sono dati che le nuove regole renderebbero non modificabili.
- Se (d) o (e) sono maggiori di zero: nello Step 2 togli la riga del controllo `user_id` corrispondente e, nel Task 1, i due test «…con user_id dell'utente 2». Registra la scelta nell'audit.

- [ ] **Step 2: Scrivi la migration**

Create `supabase/migrations/pending_rls_riferimenti.sql`:

```sql
-- AP1 Fase 2 (audit RLS): le policy di ownership verificano anche i riferimenti.
--   blocchi:  il tipo padre deve essere dell'utente
--   esercizi: blocco_id ed exercise_id, se presenti, devono essere dell'utente (SEC1)
--   tipi, esercizi: user_id deve essere l'utente (solo se i conteggi (d)/(e) erano 0)
-- Nessuna modifica ai dati. Ruolo authenticated; (select auth.uid()) per efficienza.

alter policy "user owns blocchi" on public.blocchi
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.tipi t
      join public.schede s on s.id = t.scheda_id
      where t.id = blocchi.tipo_id and s.user_id = (select auth.uid())
    )
  );

alter policy users_own_esercizi on public.esercizi
  to authenticated
  using (
    exists (
      select 1 from public.tipi t
      join public.schede s on s.id = t.scheda_id
      where t.id = esercizi.tipo_id and s.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.tipi t
      join public.schede s on s.id = t.scheda_id
      where t.id = esercizi.tipo_id and s.user_id = (select auth.uid())
    )
    and (esercizi.blocco_id is null or exists (
      select 1 from public.blocchi b
      where b.id = esercizi.blocco_id and b.user_id = (select auth.uid())
    ))
    and (esercizi.exercise_id is null or exists (
      select 1 from public.exercises x
      where x.id = esercizi.exercise_id and x.user_id = (select auth.uid())
    ))
    and esercizi.user_id = (select auth.uid())   -- togliere se il conteggio (e) non era 0
  );

alter policy users_own_tipi on public.tipi
  to authenticated
  using (
    exists (select 1 from public.schede s where s.id = tipi.scheda_id and s.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.schede s where s.id = tipi.scheda_id and s.user_id = (select auth.uid()))
    and tipi.user_id = (select auth.uid())       -- togliere se il conteggio (d) non era 0
  );
```

- [ ] **Step 3: Scrivi l'audit**

Create `docs/superpowers/notes/rls-audit.md`. I valori tra `⟨…⟩` vengono dagli Step 1 e 7 e vanno sostituiti con i dati reali:

````markdown
# Audit RLS — riferimento condiviso (AP1 Fase 2 e MNGMT1)

> Prima versione: ⟨data⟩, AP1 Fase 2 passo 0. Progetto `lzwyhokkvzxlnubsenmf`.
> Spec: `docs/superpowers/specs/2026-10-13-ap1-igiene-fase2-design.md` §7. Test: `npm run test:rls`.
> È la base delle policy cross-utente di MNGMT1: va aggiornato a ogni migration che tocca la RLS.

## Modello di accesso

Dopo AP1 il client parla direttamente con Supabase, con la chiave anon e il JWT dell'utente: **la RLS è l'unica guardia**. Nessuna service role nel client né nei test. Gli id sono `text` generati dal client (`exercises.id` è uuid). `user_id` è uuid senza default: lo imposta il client, e la policy lo verifica.

## Tabelle (stato prima della correzione, 2026-10-13)

| Tabella | Policy (ALL, ruolo `public`) | USING = WITH CHECK |
|---|---|---|
| `schede` | `users_own_schede` | `auth.uid() = user_id` |
| `tipi` | `users_own_tipi` | esiste la scheda padre con `user_id = auth.uid()` |
| `esercizi` | `users_own_esercizi` | esiste tipo → scheda con `user_id = auth.uid()` |
| `blocchi` | `user owns blocchi` | `auth.uid() = user_id` |
| `exercises` | `user owns exercises` | `auth.uid() = user_id` |
| `workouts` | `users_own_workouts` | `auth.uid() = user_id` |
| `weight_logs` | `users_own_weight_logs` | `auth.uid() = user_id` |

Nessuna policy ha un WITH CHECK proprio: per le policy ALL Postgres applica l'USING anche alle scritture.

**FK e cascade:**
- `tipi.scheda_id → schede` (cascade);
- `blocchi.tipo_id → tipi` (cascade);
- `esercizi.tipo_id → tipi` (cascade);
- `esercizi.blocco_id → blocchi` (cascade);
- `esercizi.exercise_id → exercises` (no action);
- `user_id → auth.users`: cascade su `blocchi` ed `exercises`; **no action** su `schede`, `tipi`, `esercizi`, `workouts` e `weight_logs`.

## Problemi trovati

1. `blocchi`: la policy controllava solo `user_id`, quindi si poteva agganciare un blocco a un tipo altrui.
2. `esercizi`: `blocco_id` ed `exercise_id` non erano verificati, quindi si poteva puntare a righe altrui. È SEC1.
3. `tipi`, `esercizi`: la colonna `user_id` non era verificata.
4. Cancellazione account (prima di TestFlight): le FK `user_id` in no action bloccano l'eliminazione di un utente auth finché ha dati. **Aperto**: da risolvere nel task «Cancellazione account in-app».

Nessuno di questi problemi esponeva dati altrui in lettura.

## Conteggi prima della correzione (⟨data⟩)

| Controllo | Righe |
|---|---|
| (a) blocchi con tipo altrui | ⟨n⟩ |
| (b) esercizi con blocco altrui | ⟨n⟩ |
| (c) esercizi con exercise altrui | ⟨n⟩ |
| (d) tipi con user_id diverso dal proprietario | ⟨n⟩ |
| (e) esercizi con user_id diverso dal proprietario | ⟨n⟩ |

## Correzione

Migration `⟨versione⟩_rls_riferimenti.sql`, approvata da Fabrizio il ⟨data⟩. Le policy di `blocchi`, `esercizi` e `tipi` passano al ruolo `authenticated` e il loro WITH CHECK verifica i riferimenti (vedi il file).

Inversa, solo in caso di problemi: ripristina le policy del 2026-10-13.

```sql
alter policy "user owns blocchi" on public.blocchi to public
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter policy users_own_esercizi on public.esercizi to public
  using (exists (select 1 from public.tipi join public.schede on schede.id = tipi.scheda_id
                 where tipi.id = esercizi.tipo_id and schede.user_id = auth.uid()))
  with check (exists (select 1 from public.tipi join public.schede on schede.id = tipi.scheda_id
                      where tipi.id = esercizi.tipo_id and schede.user_id = auth.uid()));
alter policy users_own_tipi on public.tipi to public
  using (exists (select 1 from public.schede where schede.id = tipi.scheda_id and schede.user_id = auth.uid()))
  with check (exists (select 1 from public.schede where schede.id = tipi.scheda_id and schede.user_id = auth.uid()));
```

## Casi di test (`tests/db/rls.test.ts`)

| Gruppo | Prima della correzione | Dopo |
|---|---|---|
| select / update / delete sulle righe dell'utente 2 (7 tabelle) | passano | passano |
| insert a nome dell'utente 2 | passano | passano |
| agganci a scheda o tipo altrui; spostamento di un tipo | passano | passano |
| blocco in tipo altrui; `blocco_id` ed `exercise_id` altrui | **falliscono** | passano |
| `user_id` altrui su tipi ed esercizi | **falliscono** | ⟨passano / test rimossi⟩ |
| utente anonimo | passano | passano |

Successivi: RPC `duplica_scheda` (Task 6), `ai_usage` (Task 11), Edge Function `import-pdf` (Task 15).

## Da fare per MNGMT1

- Policy trainer/trainee/superadmin a partire da questa tabella.
- Libreria esercizi globale (`exercises.user_id IS NULL`): estendere la condizione su `exercise_id`.
- FK `user_id` in no action (problema 4).
- Lo storico migration non contiene le colonne `user_id`, le FK verso `auth.users`, l'attivazione della RLS né le policy `users_own_*`, applicate fuori banda (`docs/superpowers/notes/ap1-storico-migration.md`). Prima di creare un progetto di sviluppo serve una migration di baseline che le ricrei.
````

- [ ] **Step 4: Mostra conteggi e SQL a Fabrizio e aspetta l'ok**

Messaggio a Fabrizio: i 5 conteggi dello Step 1, il testo completo di `pending_rls_riferimenti.sql` e i test che ci si aspetta passino da rossi a verdi.
Expected: «ok» esplicito. Senza ok, ci si ferma.

- [ ] **Step 5: Applica la migration**

Tool MCP `apply_migration` con `project_id: "lzwyhokkvzxlnubsenmf"`, `name: "rls_riferimenti"` e come `query` il contenuto del file.
Expected: successo.

- [ ] **Step 6: Allinea il nome del file alla versione remota**

Tool MCP `list_migrations` → leggi la versione assegnata a `rls_riferimenti` (14 cifre).
Run: `git mv supabase/migrations/pending_rls_riferimenti.sql supabase/migrations/<versione>_rls_riferimenti.sql`

Lo schema delle tabelle non cambia, quindi non serve rigenerare i tipi.

- [ ] **Step 7: Verifica**

Run: `npm run test:rls`
Expected: tutti i test PASS.

Tool MCP `get_advisors` con `type: "security"`.
Expected: nessun avviso nuovo; resta solo «Leaked password protection disabled», se Fabrizio non l'ha ancora attivata.

Completa l'audit con versione, data e la colonna «Dopo».

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations docs/superpowers/notes/rls-audit.md tests/db/rls.test.ts
git commit -F - <<'EOF'
fix(rls): le policy verificano i riferimenti (blocchi, esercizi, tipi)

- blocchi: il tipo padre deve essere dell'utente
- esercizi: blocco_id ed exercise_id devono essere dell'utente (SEC1)
- tipi/esercizi: user_id deve essere l'utente
- policy al ruolo authenticated; nessuna modifica ai dati
- audit RLS in docs/superpowers/notes/rls-audit.md, condiviso con MNGMT1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

## Passo 1 — Workouts (sessione) → push P1

### Task 3: Basi del livello dati

**Esecuzione:** sessione.

**Files:**
- Create: `lib/data/db.types.ts` (generato), `lib/data/types.ts`, `lib/data/errors.ts`, `lib/data/errors.test.ts`, `lib/data/session.ts`
- Modify: `lib/supabase.ts`, `providers/AppProvider.tsx:8-80`

**Interfaces:**
- Produces:
  - in `lib/data/types.ts`: `Esercizio`, `BloccoTipo`, `Blocco`, `Tipo`, `tipoEsercizi()`, `Scheda`, `SchedaMeta`, `Workout`, `WeightLog`, `WorkoutInput`, `SchedaInput`, `EsercizioInput`, `WeightLogInput`, `ImportPdfOptions`, `ImportPdfEsercizio`, `ImportPdfResult`;
  - in `lib/data/errors.ts`: `type DataErrorKind = 'auth' | 'forbidden' | 'not_found' | 'conflict' | 'invalid' | 'limit' | 'network' | 'server'`, la classe `DataError` (con `kind` e `code?`), `fromPostgrest(error: { code?: string | null; message: string }): DataError` e `toDataError(err: unknown): DataError`;
  - in `lib/data/session.ts`: `type Db = SupabaseClient<Database>` e `requireUserId(db: Db): Promise<string>`;
  - `lib/supabase.ts` esporta `supabase: SupabaseClient<Database>`.

- [ ] **Step 1: Genera i tipi dallo schema**

Tool MCP `generate_typescript_types` con `project_id: "lzwyhokkvzxlnubsenmf"`.
Create `lib/data/db.types.ts`: in testa la riga seguente, poi l'output del tool senza modifiche.

```ts
// Generato da Supabase (generate_typescript_types). Non modificare a mano: rigenerare dopo ogni migration.
```

Run: `grep -c "export type Database\|export type Tables<\|export type TablesInsert<\|export type TablesUpdate<\|export type Json" lib/data/db.types.ts`
Expected: `5`.

- [ ] **Step 2: Scrivi il test degli errori**

Create `lib/data/errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DataError, fromPostgrest, toDataError } from './errors';

describe('fromPostgrest', () => {
  it.each([
    ['PGRST116', 'not_found'],
    ['P0002', 'not_found'],
    ['42501', 'forbidden'],
    ['23505', 'conflict'],
    ['23514', 'invalid'],
    ['23503', 'invalid'],
    ['22P02', 'invalid'],
    ['XX000', 'server'],
  ])('codice %s → %s', (code, kind) => {
    const e = fromPostgrest({ code, message: 'messaggio' });
    expect(e).toBeInstanceOf(DataError);
    expect(e.kind).toBe(kind);
    expect(e.code).toBe(code);
    expect(e.message).toBe('messaggio');
  });

  it('errore di rete (codice vuoto) → network', () => {
    expect(fromPostgrest({ code: '', message: 'TypeError: fetch failed' }).kind).toBe('network');
    expect(fromPostgrest({ message: 'Load failed' }).kind).toBe('network');
  });
});

describe('toDataError', () => {
  it('lascia passare un DataError', () => {
    const e = new DataError('limit', 'x');
    expect(toDataError(e)).toBe(e);
  });

  it('TypeError di fetch → network', () => {
    expect(toDataError(new TypeError('Failed to fetch')).kind).toBe('network');
  });

  it('AbortError e TimeoutError → network', () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    expect(toDataError(abort).kind).toBe('network');
    expect(toDataError(new DOMException('Timeout', 'TimeoutError')).kind).toBe('network');
  });

  it('qualunque altro valore → server', () => {
    expect(toDataError('boh').kind).toBe('server');
    expect(toDataError(new Error('x')).message).toBe('x');
  });
});
```

- [ ] **Step 3: Esegui il test e verifica che fallisca**

Run: `npm test`
Expected: FAIL, con `Cannot find module './errors'` o un errore equivalente.

- [ ] **Step 4: Implementa `errors.ts`**

Create `lib/data/errors.ts`:

```ts
// Errori del livello dati (AP1 Fase 2): un solo tipo, con un `kind` che la UI può usare.

export type DataErrorKind =
  | 'auth' | 'forbidden' | 'not_found' | 'conflict' | 'invalid' | 'limit' | 'network' | 'server';

export class DataError extends Error {
  readonly kind: DataErrorKind;
  readonly code?: string;

  constructor(kind: DataErrorKind, message: string, options: { code?: string; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = 'DataError';
    this.kind = kind;
    this.code = options.code;
  }
}

const KIND_BY_CODE: Record<string, DataErrorKind> = {
  PGRST116: 'not_found', // .single() senza righe (update di riga inesistente o non propria)
  P0002: 'not_found',    // raise no_data_found nelle RPC
  '42501': 'forbidden',  // violazione RLS / permesso negato
  '23505': 'conflict',   // chiave duplicata
  '23514': 'invalid',    // check constraint
  '23502': 'invalid',    // not null
  '23503': 'invalid',    // foreign key
  '22P02': 'invalid',    // formato non valido (uuid, numero)
  '22007': 'invalid',    // data non valida
  '22008': 'invalid',    // data fuori intervallo
};

/** Converte un errore restituito da supabase-js ({ code, message }) in DataError. */
export function fromPostgrest(error: { code?: string | null; message: string }): DataError {
  const code = error.code ?? '';
  const kind = KIND_BY_CODE[code]
    ?? (!code && /fetch|network|load failed/i.test(error.message) ? 'network' : 'server');
  return new DataError(kind, error.message, { code: code || undefined, cause: error });
}

/** Converte qualunque valore lanciato in DataError (lo lascia passare se lo è già). */
export function toDataError(err: unknown): DataError {
  if (err instanceof DataError) return err;
  if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
    return new DataError('network', 'Tempo scaduto: riprova.', { cause: err });
  }
  if (err instanceof TypeError) {
    return new DataError('network', 'Connessione assente o instabile.', { cause: err });
  }
  return new DataError('server', err instanceof Error ? err.message : String(err), { cause: err });
}
```

- [ ] **Step 5: Esegui il test e verifica che passi**

Run: `npm test`
Expected: PASS, 13 test.

- [ ] **Step 6: Sposta i tipi di dominio in `lib/data/types.ts`**

Create `lib/data/types.ts`:

```ts
// Tipi di dominio dell'app (spostati da providers/AppProvider.tsx in AP1 Fase 2,
// che li riesporta) e tipi di input/risultato del livello dati.
import type { ExerciseResult } from '@/lib/liveTypes';

export interface Esercizio {
  id: string;
  titolo: string;
  ripetizioni: string;
  carico: string;
  recupero: string;
  note: string;
  setsTarget?: number;
  exerciseId?: string;     // Q1-infra: FK opzionale verso exercises.id (canonical UUID per analytics cross-scheda)
  restSeconds?: number;    // Q1-infra: recupero in secondi (numerico). Se null, fallback parseRecuperoSeconds(recupero) o DEFAULT_REST_SECONDS.
  bloccoId?: string;       // FIX6: se set, l'esercizio appartiene a un blocco circuito (altrimenti è "singolo")
}

// FIX6: blocco circuito tra Tipo (giorno) ed Esercizio.
export type BloccoTipo = 'circuito_amrap' | 'circuito_giri' | 'singolo';

export interface Blocco {
  id: string;
  tipo: BloccoTipo;
  durataMinuti?: number;   // solo circuito_amrap
  giriTarget?: number;     // riservato circuito_giri (SPEC §7)
  notaComune?: string;
  esercizi: Esercizio[];
}

export interface Tipo {
  id: string;
  nome: string;
  esercizi: Esercizio[];   // FIX6: solo esercizi SINGOLI (fuori da blocchi)
  blocchi: Blocco[];       // FIX6: circuiti del giorno
}

// FIX6: tutti gli esercizi di un giorno (singoli + quelli dentro i blocchi),
// nell'ordine singoli → blocchi. Usato per conteggi e per la Live (Fase 1: la
// Live tratta ancora i circuiti come sequenza finché non arriva la pagina AMRAP).
export function tipoEsercizi(t: Tipo): Esercizio[] {
  return [...t.esercizi, ...t.blocchi.flatMap(b => b.esercizi)];
}

export interface Scheda {
  id: string;
  nome: string;
  mese: string;
  dataInizio?: string;
  weeks?: number;
  tipi: Tipo[];
}

export interface Workout {
  id: string;
  data: string;
  ora: string;
  scheda: string;
  tipo: string;
  durata: number;
  note: string;
  setsCompleted?: number;
  setsTotal?: number;
  exercisesCompleted?: number;
  exercisesTotal?: number;
  programmaWeek?: number;
  voiceNoteTranscript?: string;
  source?: 'manual' | 'live';
  exerciseResults?: ExerciseResult[];  // Q1-infra: JSONB workouts.exercise_results
}

export interface WeightLog {
  id: string;
  date: string;
  esNome: string;
  carico: string;
  note: string;
}

// ─── AP1 Fase 2: input e risultati del livello dati ───

/** Scheda senza l'albero dei giorni (risposta dell'update). */
export type SchedaMeta = Omit<Scheda, 'tipi'>;

export interface SchedaInput {
  nome: string;
  mese: string;
  dataInizio?: string | null;
  weeks?: number | null;
}

/** Campi modificabili di un esercizio (il blocco non si cambia da qui). */
export type EsercizioInput = Omit<Esercizio, 'id' | 'bloccoId'>;

/** Stessi campi del body di POST/PUT /api/workouts. `durata` può arrivare come stringa dal form. */
export interface WorkoutInput {
  data: string;
  ora?: string;
  scheda?: string;
  tipo?: string;
  durata?: number | string;
  note?: string;
  setsCompleted?: number;
  setsTotal?: number;
  exercisesCompleted?: number;
  exercisesTotal?: number;
  programmaWeek?: number;
  voiceNoteTranscript?: string | null;
  source?: 'manual' | 'live';
  exerciseResults?: ExerciseResult[];
}

export interface WeightLogInput {
  date: string;
  esNome: string;
  carico: string;
  note: string;
}

export interface ImportPdfOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Solo per i test: sostituiscono fetch e le variabili d'ambiente. */
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  anonKey?: string;
}

export interface ImportPdfEsercizio {
  id: string;
  titolo: string;
  ripetizioni: string;
  carico: string;
  recupero: string;
  note: string;
}

/** Risposta 201 della Edge Function import-pdf. */
export interface ImportPdfResult {
  id: string;
  nome: string;
  mese: string;
  tipi: Array<{
    id: string;
    nome: string;
    esercizi: ImportPdfEsercizio[];
    blocchi: Array<{
      id: string;
      tipo: BloccoTipo;
      durataMinuti: number | null;
      giriTarget: number | null;
      notaComune: string;
      esercizi: ImportPdfEsercizio[];
    }>;
  }>;
}
```

In `providers/AppProvider.tsx` sostituisci le righe 8–80, da `export interface Esercizio {` fino alla `}` che chiude `export interface WeightLog`, con:

```ts
import type { Scheda, Workout, WeightLog } from '@/lib/data/types';

// I tipi di dominio vivono in lib/data/types.ts (AP1 Fase 2). Restano riesportati da qui
// perché pagine e componenti li importano da '@/providers/AppProvider'.
export type { Esercizio, BloccoTipo, Blocco, Tipo, Scheda, Workout, WeightLog } from '@/lib/data/types';
export { tipoEsercizi } from '@/lib/data/types';
```

- [ ] **Step 7: Sessione e client tipizzato**

Create `lib/data/session.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './db.types';
import { DataError } from './errors';

/** Client Supabase tipizzato con lo schema del progetto. */
export type Db = SupabaseClient<Database>;

/** Id dell'utente della sessione corrente; DataError('auth') se non c'è sessione. */
export async function requireUserId(db: Db): Promise<string> {
  const { data, error } = await db.auth.getSession();
  const id = data.session?.user.id;
  if (error || !id) {
    throw new DataError('auth', 'Sessione assente: accedi di nuovo.', { cause: error ?? undefined });
  }
  return id;
}
```

Sostituisci il contenuto di `lib/supabase.ts` con:

```ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/data/db.types';

let _client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!_client) {
    _client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

// Proxy lazy: il client viene creato solo quando viene usato (non al module eval).
// Unico punto in cui si crea il client: in Fase 4 qui si aggiunge lo storage nativo.
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop: string) {
    return (getClient() as any)[prop];
  }
});
```

- [ ] **Step 8: Verifica**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: nessun errore TypeScript, test PASS, build completata. L'app non cambia comportamento.

- [ ] **Step 9: Commit**

```bash
git add lib/data/db.types.ts lib/data/types.ts lib/data/errors.ts lib/data/errors.test.ts lib/data/session.ts lib/supabase.ts providers/AppProvider.tsx
git commit -F - <<'EOF'
feat(data): basi del livello dati (tipi, errori, sessione)

- tipi generati dallo schema (lib/data/db.types.ts) e client tipizzato
- tipi di dominio spostati in lib/data/types.ts (AppProvider li riesporta)
- DataError con kind (auth, forbidden, not_found, conflict, invalid,
  limit, network, server) e conversione dagli errori di supabase-js
- requireUserId: id utente dalla sessione

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Modulo workouts e parità

**Esecuzione:** sessione. Questo task fissa le convenzioni del livello dati.

**Files:**
- Create: `lib/data/workouts.ts`, `lib/data/workouts.test.ts`, `lib/data/index.ts`, `tests/db/parity/workouts.test.ts`

**Interfaces:**
- Consumes: `Db` e `requireUserId` (`session.ts`); `fromPostgrest` (`errors.ts`); `Workout` e `WorkoutInput` (`types.ts`); `newId()` (`lib/utils.ts`).
- Produces:
  - in `workouts.ts`:
    - `shapeWorkout(w): Workout`;
    - `toWorkoutFields(input: WorkoutInput)`;
    - `createWorkoutsApi(db: Db)`, che restituisce `{ list(): Promise<Workout[]>; create(input: WorkoutInput, opts?: { id?: string }): Promise<Workout>; update(id: string, input: WorkoutInput): Promise<Workout>; remove(id: string): Promise<void> }`;
  - in `index.ts`: `createDataApi(db: Db)`, `type DataApi`, `dataApi: DataApi`, e le riesportazioni di `DataError` e `toDataError`.

**Convenzioni fissate qui (le seguono anche i Task 7, 9 e 14):**
- **Un file per risorsa**, con i mapping puri esportati e una funzione `createXxxApi(db)`.
- **Ogni funzione API inizia con `requireUserId(db)`**, così, se non c'è sessione, fallisce subito con `auth`.
- **Errori**: ogni errore di supabase-js si lancia con `throw fromPostgrest(error)`.
- **Stessi default, normalizzazioni e ordinamenti della route**: la parità si verifica in `tests/db/parity/`.

- [ ] **Step 1: Scrivi il test dei mapping**

Create `lib/data/workouts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { shapeWorkout, toWorkoutFields } from './workouts';

describe('shapeWorkout', () => {
  it('applica i default della vecchia route', () => {
    expect(shapeWorkout({ id: 'w1', data: '2026-10-01' })).toEqual({
      id: 'w1', data: '2026-10-01', ora: '', scheda: '', tipo: '', durata: 0, note: '', source: 'manual',
    });
  });

  it('mappa i campi della Live', () => {
    const w = shapeWorkout({
      id: 'w2', data: '2026-10-02', ora: '18:30', scheda: 'S', tipo: 'A', durata: 50, note: 'n',
      sets_completed: 10, sets_total: 12, exercises_completed: 4, exercises_total: 5,
      programma_week: 2, voice_note_transcript: 'v', source: 'live', exercise_results: [],
    });
    expect(w).toEqual({
      id: 'w2', data: '2026-10-02', ora: '18:30', scheda: 'S', tipo: 'A', durata: 50, note: 'n',
      setsCompleted: 10, setsTotal: 12, exercisesCompleted: 4, exercisesTotal: 5,
      programmaWeek: 2, voiceNoteTranscript: 'v', source: 'live', exerciseResults: [],
    });
  });
});

describe('toWorkoutFields', () => {
  it('normalizza come la route: stringhe vuote e durata intera', () => {
    expect(toWorkoutFields({ data: '2026-10-01', durata: '45' })).toEqual({
      data: '2026-10-01', ora: '', scheda: '', tipo: '', durata: 45, note: '',
    });
  });

  it('durata assente o non numerica → 0', () => {
    expect(toWorkoutFields({ data: 'd' }).durata).toBe(0);
    expect(toWorkoutFields({ data: 'd', durata: 'abc' }).durata).toBe(0);
  });

  it('scrive i campi opzionali solo se presenti', () => {
    const r = toWorkoutFields({ data: 'd', setsCompleted: 3, source: 'live', voiceNoteTranscript: null, exerciseResults: [] });
    expect(r).toMatchObject({ sets_completed: 3, source: 'live', voice_note_transcript: null, exercise_results: [] });
    expect('sets_total' in r).toBe(false);
    expect('programma_week' in r).toBe(false);
  });

  it('source diverso da live → manual', () => {
    expect(toWorkoutFields({ data: 'd', source: 'manual' }).source).toBe('manual');
  });
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npm test`
Expected: FAIL per `workouts.test.ts` (modulo mancante).

- [ ] **Step 3: Implementa `workouts.ts`**

Create `lib/data/workouts.ts`:

```ts
// Workouts sul livello dati (AP1 Fase 2): stessa logica di app/api/workouts.
import type { ExerciseResult } from '@/lib/liveTypes';
import { newId } from '@/lib/utils';
import type { Json, Tables, TablesInsert, TablesUpdate } from './db.types';
import { fromPostgrest } from './errors';
import { requireUserId, type Db } from './session';
import type { Workout, WorkoutInput } from './types';

type WorkoutRow = Tables<'workouts'>;
/** Basta id + data: la create costruisce il Workout dalla riga appena scritta. */
type WorkoutSource = Pick<WorkoutRow, 'id' | 'data'> & Partial<WorkoutRow>;
type WorkoutFields = TablesUpdate<'workouts'> & Pick<WorkoutRow, 'data'>;

export function shapeWorkout(w: WorkoutSource): Workout {
  return {
    id: w.id,
    data: w.data,
    ora: w.ora ?? '',
    scheda: w.scheda ?? '',
    tipo: w.tipo ?? '',
    durata: w.durata ?? 0,
    note: w.note ?? '',
    setsCompleted: w.sets_completed ?? undefined,
    setsTotal: w.sets_total ?? undefined,
    exercisesCompleted: w.exercises_completed ?? undefined,
    exercisesTotal: w.exercises_total ?? undefined,
    programmaWeek: w.programma_week ?? undefined,
    voiceNoteTranscript: w.voice_note_transcript ?? undefined,
    source: (w.source as 'manual' | 'live' | null | undefined) ?? 'manual',
    exerciseResults: (w.exercise_results as unknown as ExerciseResult[] | null | undefined) ?? undefined,
  };
}

/** Campi scrivibili, con i default e le normalizzazioni della vecchia route (POST e PUT). */
export function toWorkoutFields(input: WorkoutInput): WorkoutFields {
  const row: WorkoutFields = {
    data: input.data,
    ora: input.ora || '',
    scheda: input.scheda || '',
    tipo: input.tipo || '',
    durata: parseInt(String(input.durata), 10) || 0,
    note: input.note || '',
  };
  if (input.setsCompleted !== undefined) row.sets_completed = input.setsCompleted;
  if (input.setsTotal !== undefined) row.sets_total = input.setsTotal;
  if (input.exercisesCompleted !== undefined) row.exercises_completed = input.exercisesCompleted;
  if (input.exercisesTotal !== undefined) row.exercises_total = input.exercisesTotal;
  if (input.programmaWeek !== undefined) row.programma_week = input.programmaWeek;
  if (input.voiceNoteTranscript !== undefined) row.voice_note_transcript = input.voiceNoteTranscript;
  if (input.source !== undefined) row.source = input.source === 'live' ? 'live' : 'manual';
  if (input.exerciseResults !== undefined) row.exercise_results = input.exerciseResults as unknown as Json;
  return row;
}

export function createWorkoutsApi(db: Db) {
  return {
    async list(): Promise<Workout[]> {
      await requireUserId(db);
      const { data, error } = await db.from('workouts').select('*').order('data');
      if (error) throw fromPostgrest(error);
      return (data ?? []).map(shapeWorkout);
    },

    /** `opts.id`: id scelto dal chiamante (servirà a OFF1 per l'idempotenza); di default newId(). */
    async create(input: WorkoutInput, opts: { id?: string } = {}): Promise<Workout> {
      const userId = await requireUserId(db);
      const row: TablesInsert<'workouts'> = { id: opts.id ?? newId(), ...toWorkoutFields(input), user_id: userId };
      const { error } = await db.from('workouts').insert(row);
      if (error) throw fromPostgrest(error);
      return shapeWorkout(row);
    },

    async update(id: string, input: WorkoutInput): Promise<Workout> {
      await requireUserId(db);
      const { data, error } = await db.from('workouts').update(toWorkoutFields(input)).eq('id', id).select().single();
      if (error) throw fromPostgrest(error);
      return shapeWorkout(data);
    },

    async remove(id: string): Promise<void> {
      await requireUserId(db);
      const { error } = await db.from('workouts').delete().eq('id', id);
      if (error) throw fromPostgrest(error);
    },
  };
}

export type WorkoutsApi = ReturnType<typeof createWorkoutsApi>;
```

Create `lib/data/index.ts`:

```ts
// Livello dati dell'app (AP1 Fase 2): il client parla direttamente con Supabase, la RLS fa da guardia.
import { supabase } from '@/lib/supabase';
import type { Db } from './session';
import { createWorkoutsApi } from './workouts';

export function createDataApi(db: Db) {
  return {
    workouts: createWorkoutsApi(db),
  };
}

export type DataApi = ReturnType<typeof createDataApi>;

/** Istanza dell'app: client del browser, sessione dell'utente. */
export const dataApi: DataApi = createDataApi(supabase);

export { DataError, toDataError } from './errors';
export type { DataErrorKind } from './errors';
```

- [ ] **Step 4: Esegui i test unit e verifica che passino**

Run: `npm test && npx tsc --noEmit`
Expected: PASS (13 test di `errors` e 6 di `workouts`) e nessun errore TypeScript.

- [ ] **Step 5: Scrivi il test di parità**

Create `tests/db/parity/workouts.test.ts`:

```ts
// Parità temporanea (fino a P4): vecchie route ↔ livello dati, stesso utente di test.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GET as routeList, POST as routeCreate } from '@/app/api/workouts/route';
import { PUT as routeUpdate } from '@/app/api/workouts/[id]/route';
import { createDataApi } from '@/lib/data';
import type { Db } from '@/lib/data/session';
import { cleanupMarked, MARK, signIn, type TestUser } from '../helpers';

let u1: TestUser;

const req = (method: string, body?: unknown) =>
  new Request('http://parity.test/api', {
    method,
    headers: { authorization: `Bearer ${u1.token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
const withoutId = <T extends { id: string }>({ id: _id, ...rest }: T) => rest;

beforeAll(async () => {
  u1 = await signIn(1);
  await cleanupMarked([u1]);
});

afterAll(async () => {
  if (u1) await cleanupMarked([u1]);
});

describe('parità workouts: vecchie route ↔ livello dati', () => {
  it('create, update e list danno lo stesso JSON', async () => {
    const api = createDataApi(u1.db as unknown as Db);
    const input = {
      data: '2026-01-02', ora: '07:00', scheda: 'S', tipo: 'A', durata: '30', note: `${MARK} parità`,
      setsCompleted: 3, setsTotal: 4, source: 'live' as const, exerciseResults: [],
    };

    const createdR = await (await routeCreate(req('POST', input))).json();
    const createdD = await api.workouts.create(input);
    expect(withoutId(createdD)).toEqual(withoutId(createdR));

    const patch = { ...input, note: `${MARK} parità 2`, durata: 41 };
    const updR = await (await routeUpdate(req('PUT', patch), { params: Promise.resolve({ id: createdR.id }) })).json();
    const updD = await api.workouts.update(createdD.id, patch);
    expect(withoutId(updD)).toEqual(withoutId(updR));

    const listR = await (await routeList(req('GET'))).json();
    const listD = await api.workouts.list();
    expect([...listD].sort(byId)).toEqual([...listR].sort(byId));
    const dates = listD.map(w => w.data);
    expect(dates).toEqual([...dates].sort()); // ordinate per data, come la route
  });
});
```

- [ ] **Step 6: Esegui la parità**

Run: `npm run test:db -- tests/db/parity/workouts.test.ts`
Expected: PASS. Se fallisce, il diff di Vitest mostra il campo diverso: correggi `workouts.ts`, non il test.

- [ ] **Step 7: Commit**

```bash
git add lib/data/workouts.ts lib/data/workouts.test.ts lib/data/index.ts tests/db/parity/workouts.test.ts
git commit -F - <<'EOF'
feat(data): workouts sul livello dati, con test di parità

- mapping puri (shapeWorkout, toWorkoutFields) con gli stessi default
  della vecchia route, testati
- createWorkoutsApi: list/create/update/remove su supabase-js (RLS)
- createDataApi e istanza dataApi
- parità con /api/workouts verificata sul DB con l'utente di test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Call site workouts, cancello P1 e push

**Esecuzione:** sessione.

**Files:**
- Modify: `providers/AppProvider.tsx` (`loadWorkouts`), `app/(app)/home/page.tsx:36,89-115`, `app/(app)/live/summary/page.tsx:37,96-105`, `app/(app)/AppLayoutClient.tsx:16,48-86`

**Interfaces:**
- Consumes: `dataApi.workouts`, `toDataError` (Task 4), `WorkoutInput` (Task 3).
- Produces: nessun call site che usi `/api/workouts`.

- [ ] **Step 1: `AppProvider.loadWorkouts`**

In `providers/AppProvider.tsx` aggiungi l'import:

```ts
import { dataApi } from '@/lib/data';
```

e sostituisci `loadWorkouts` con:

```ts
  const loadWorkouts = useCallback(async () => {
    if (!authToken) return;
    try {
      setWorkouts(await dataApi.workouts.list());
    } catch (err) {
      console.error('[loadWorkouts]', err);
    }
  }, [authToken]);
```

- [ ] **Step 2: Home**

In `app/(app)/home/page.tsx`:
- aggiungi `import { dataApi, toDataError } from '@/lib/data';`;
- la riga 36 diventa `const { workouts, schede, loadWorkouts, toast } = useApp();`;
- `deleteWorkout` e `doSave` diventano:

```ts
  function deleteWorkout(id: string) {
    setConfirm({
      msg: 'Eliminare questo allenamento?',
      cb: async () => {
        try {
          await dataApi.workouts.remove(id);
        } catch (err) {
          toast(`Eliminazione non riuscita — ${toDataError(err).message}`, 'error');
        }
        await loadWorkouts();
      },
    });
  }

  async function doSave() {
    setSaving(true);
    const body = { data: date, ora: time, scheda: schedaNome, tipo: tipoNome, durata, note: noteW };
    try {
      if (editId) await dataApi.workouts.update(editId, body);
      else await dataApi.workouts.create(body);
    } catch (err) {
      setSaving(false);
      toast(`Salvataggio fallito — ${toDataError(err).message}`, 'error');
      return;
    }
    setSaving(false);
    await loadWorkouts();
    toast(editId ? 'Allenamento aggiornato' : 'Allenamento salvato', 'success');
    setSheetOpen(false);
    resetForm();
  }
```

- [ ] **Step 3: Summary Live**

In `app/(app)/live/summary/page.tsx`:
- aggiungi `import { dataApi } from '@/lib/data';`;
- la riga 37 diventa `const { toast, loadWorkouts } = useApp();`;
- dentro `handleSave` sostituisci il blocco da `const r = await apiFetch('/api/workouts', {` fino alla `}` dell'`if (!r.ok) { … }` con:

```ts
      await dataApi.workouts.create(payload);
```

Il resto di `handleSave` resta com'è: `loadWorkouts`, `clearSession`, il toast, e il `catch` che mette l'allenamento in coda per qualunque errore.

- [ ] **Step 4: Flush della coda in `AppLayoutClient`**

In `app/(app)/AppLayoutClient.tsx`:
- aggiungi `import { dataApi } from '@/lib/data';` e `import type { WorkoutInput } from '@/lib/data/types';`;
- la riga 16 diventa `const { setAuthToken, loadWorkouts, loadSchede, loadWeightLogs, authToken, toast } = useApp();`;
- il ciclo `for (const p of pending) { … }` diventa:

```ts
        for (const p of pending) {
          try {
            await dataApi.workouts.create(p.payload as WorkoutInput);
            await removePendingWorkout(p.id);
            succeeded += 1;
          } catch {
            await updatePendingWorkoutRetries(p.id, p.retries + 1);
            failed += 1;
          }
        }
```

- le dipendenze dell'effetto diventano `[authToken, loadWorkouts, toast]`.

- [ ] **Step 5: Nessun call site residuo**

Run: `grep -rn "/api/workouts" app components lib providers --include='*.ts' --include='*.tsx' | grep -v '^app/api/'`
Expected: nessun output.

- [ ] **Step 6: Cancello automatico**

Run: `npx tsc --noEmit && npm run build && npm test && npm run test:db`
Expected: tutto verde (`test:db` = RLS + parità workouts).

- [ ] **Step 7: Commit**

```bash
git add providers/AppProvider.tsx "app/(app)/home/page.tsx" "app/(app)/live/summary/page.tsx" "app/(app)/AppLayoutClient.tsx"
git commit -F - <<'EOF'
feat(data): Home, Live e coda offline usano il livello dati per i workouts

- loadWorkouts, salvataggio e modifica in Home, salvataggio della Live e
  flush della coda pending passano da dataApi.workouts
- eliminazione in Home: toast d'errore (prima l'errore era ignorato)
- la route /api/workouts resta online, inutilizzata, fino a P4

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 8: Prova manuale P1 (Fabrizio)**

Avvia il server: `npm start` in background, dopo il build dello Step 6. Poi manda a Fabrizio:

> **Prova manuale P1** (build locale `http://localhost:3000`, utente di test 1)
> 1. **Prova Live rifatta per intero** (richiesta di Fabrizio): tutti i passi della checklist P0 approvata, nessuno saltato. Comprende il flusso Live completo fino al salvataggio, la duplica a mano e Preferenze.
> 2. **Modifica da Home:** apri l'allenamento appena salvato, cambia la durata e salva. Compare «Allenamento aggiornato» e il valore è quello nuovo.
> 3. **Salvataggio senza rete:**
>    - fai un'altra Live breve;
>    - prima di «Salva allenamento» togli la rete (DevTools → Network → Offline, oppure Wi-Fi spento);
>    - al salvataggio compare «Connessione assente. Dati salvati localmente.»;
>    - riattiva la rete e ricarica la pagina: compare «Sincronizzati 1 allenamenti offline.» e l'allenamento è in Home.
> 4. **Eliminazione:** elimina da Home gli allenamenti di prova; spariscono.
>
> Rispondi «ok P1», oppure dimmi a che passo qualcosa non va.

Expected: «ok P1». Poi ferma il server con `lsof -ti tcp:3000 | xargs kill`.

- [ ] **Step 9: Push P1**

Run: `git log --oneline origin/main..main`, poi `git push`
Expected: `main -> main`. Dopo 2–3 minuti `curl -s -o /dev/null -w '%{http_code}\n' https://allenamenti-app.vercel.app/login` → `200`.

---

## Passo 2 — Schede, duplica, weight-logs → push P2

### Task 6: RPC `duplica_scheda`

**Esecuzione:** sessione, prima di lanciare i subagent 2B e 2D: la funzione deve esistere nei tipi generati.

**Files:**
- Create: `supabase/migrations/pending_duplica_scheda.sql` (da rinominare), `tests/db/duplica.test.ts`
- Modify: `tests/db/rls.test.ts`, `lib/data/db.types.ts` (rigenerato)

**Interfaces:**
- Produces: la RPC `duplica_scheda(p_src_id text, p_new_id text, p_nome text, p_mese text) returns text`, presente nei tipi come `Database['public']['Functions']['duplica_scheda']`.

- [ ] **Step 1: Scrivi il test funzionale**

Create `tests/db/duplica.test.ts`:

```ts
// Test funzionale della RPC duplica_scheda (AP1 Fase 2), con l'utente di test 1.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupMarked, MARK, signIn, tid, type TestUser } from './helpers';

type Row = Record<string, any>;

const TREE = '*, tipi(*, esercizi(*), blocchi(*))';
let u1: TestUser;
const src = { scheda: tid(), tipoA: tid(), tipoB: tid(), blocco: tid(), exercise: '' };

async function run(p: PromiseLike<{ error: { message: string } | null }>, what: string) {
  const { error } = await p;
  if (error) throw new Error(`fixture ${what}: ${error.message}`);
}

beforeAll(async () => {
  u1 = await signIn(1);
  await cleanupMarked([u1]);
  const db = u1.db;
  const ex = await db.from('exercises').insert({ name: `${MARK} panca`, user_id: u1.id }).select('id').single();
  if (ex.error) throw new Error(ex.error.message);
  src.exercise = ex.data.id;
  await run(db.from('schede').insert({
    id: src.scheda, nome: `${MARK} sorgente`, mese: 'Ottobre', data_inizio: '2026-10-01', weeks: 4, user_id: u1.id,
  }), 'schede');
  await run(db.from('tipi').insert([
    { id: src.tipoA, scheda_id: src.scheda, nome: 'Giorno A', ordine: 0, user_id: u1.id },
    { id: src.tipoB, scheda_id: src.scheda, nome: 'Giorno B', ordine: 1, user_id: u1.id },
  ]), 'tipi');
  await run(db.from('blocchi').insert({
    id: src.blocco, tipo_id: src.tipoA, ordine: 0, tipo: 'circuito_amrap', durata_minuti: 12, nota_comune: 'elastico', user_id: u1.id,
  }), 'blocchi');
  await run(db.from('esercizi').insert([
    { id: tid(), tipo_id: src.tipoA, titolo: 'Panca', ripetizioni: '4x8', carico: '80kg', recupero: '90s', note: 'n1',
      ordine: 0, sets_target: 4, exercise_id: src.exercise, rest_seconds: 90, user_id: u1.id },
    { id: tid(), tipo_id: src.tipoA, blocco_id: src.blocco, titolo: 'Burpee', ripetizioni: '10', ordine: 1, user_id: u1.id },
    { id: tid(), tipo_id: src.tipoA, blocco_id: src.blocco, titolo: 'Squat', ripetizioni: '15', ordine: 2, user_id: u1.id },
    { id: tid(), tipo_id: src.tipoB, titolo: 'Trazioni', ripetizioni: '3xMax', ordine: 0, sets_target: 3, user_id: u1.id },
  ]), 'esercizi');
});

afterAll(async () => {
  if (u1) await cleanupMarked([u1]);
});

const byOrdine = (a: Row, b: Row) => a.ordine - b.ordine;
/** Campi di contenuto: tutto tranne id, chiavi esterne, proprietario e timestamp. */
const content = ({ id: _i, tipo_id: _t, blocco_id: _b, scheda_id: _s, user_id: _u, created_at: _c, ...rest }: Row) => rest;
const tipoContent = ({ esercizi: _e, blocchi: _b, ...t }: Row) => content(t);

async function readTree(id: string): Promise<Row> {
  const { data, error } = await u1.db.from('schede').select(TREE).eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

describe('duplica_scheda', () => {
  it('copia scheda, giorni, blocchi ed esercizi con tutti i campi e id nuovi', async () => {
    const copyId = tid();
    const { data, error } = await u1.db.rpc('duplica_scheda', {
      p_src_id: src.scheda, p_new_id: copyId, p_nome: `${MARK} copia`, p_mese: 'Novembre',
    });
    expect(error).toBeNull();
    expect(data).toBe(copyId);

    const a = await readTree(src.scheda);
    const b = await readTree(copyId);
    expect(b).toMatchObject({ nome: `${MARK} copia`, mese: 'Novembre', data_inizio: null, weeks: null, user_id: u1.id });

    const ta = [...a.tipi].sort(byOrdine);
    const tb = [...b.tipi].sort(byOrdine);
    expect(tb.map(tipoContent)).toEqual(ta.map(tipoContent));
    for (let i = 0; i < ta.length; i++) {
      expect(tb[i].id).not.toBe(ta[i].id);
      expect([...tb[i].blocchi].sort(byOrdine).map(content)).toEqual([...ta[i].blocchi].sort(byOrdine).map(content));
      expect([...tb[i].esercizi].sort(byOrdine).map(content)).toEqual([...ta[i].esercizi].sort(byOrdine).map(content));
    }

    // gli esercizi del circuito puntano al blocco copiato, non a quello sorgente
    const giornoA = tb.find((t: Row) => t.nome === 'Giorno A');
    const bloccoCopia = giornoA.blocchi[0].id;
    expect(bloccoCopia).not.toBe(src.blocco);
    const nelBlocco = giornoA.esercizi.filter((e: Row) => e.blocco_id !== null);
    expect(nelBlocco).toHaveLength(2);
    expect(nelBlocco.every((e: Row) => e.blocco_id === bloccoCopia)).toBe(true);
  });

  it('nome vuoto → «<originale> (copia)», mese vuoto → stringa vuota', async () => {
    const copyId = tid();
    const { error } = await u1.db.rpc('duplica_scheda', { p_src_id: src.scheda, p_new_id: copyId, p_nome: '', p_mese: '' });
    expect(error).toBeNull();
    const b = await readTree(copyId);
    expect(b.nome).toBe(`${MARK} sorgente (copia)`);
    expect(b.mese).toBe('');
  });
});
```

Aggiungi in fondo a `tests/db/rls.test.ts`:

```ts
describe('RLS: RPC duplica_scheda', () => {
  it("l'utente 1 non può duplicare la scheda dell'utente 2", async () => {
    const { data, error } = await u1.db.rpc('duplica_scheda', {
      p_src_id: t2.schedaId, p_new_id: tid(), p_nome: `${MARK} furto`, p_mese: '',
    });
    expect(data).toBeNull();
    expect(error?.code).toBe('P0002');
  });

  it('utente anonimo: la RPC non è eseguibile', async () => {
    const { error } = await anonClient().rpc('duplica_scheda', {
      p_src_id: t2.schedaId, p_new_id: tid(), p_nome: '', p_mese: '',
    });
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npm run test:db -- tests/db/duplica.test.ts tests/db/rls.test.ts`
Expected: FAIL nei test della duplica: la funzione non esiste (errore `PGRST202`).

- [ ] **Step 3: Scrivi la migration**

Create `supabase/migrations/pending_duplica_scheda.sql`:

```sql
-- AP1 Fase 2: duplica una scheda in modo atomico (tutto o niente).
-- SECURITY INVOKER: la RLS vale anche qui, quindi si duplicano solo le proprie schede.
-- Copia tutti i campi di giorni, blocchi (rimappando blocco_id) ed esercizi;
-- data_inizio e weeks restano vuoti (la copia è un nuovo periodo).
-- p_new_id lo genera il client (newId): l'elenco schede è ordinato per id.
create or replace function public.duplica_scheda(
  p_src_id text,
  p_new_id text,
  p_nome   text,
  p_mese   text
) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_nome     text;
  v_tipo     record;
  v_blocco   record;
  v_new_tipo text;
  v_map      jsonb;
begin
  if v_uid is null then
    raise exception 'sessione assente' using errcode = '42501';
  end if;

  select s.nome into v_nome from public.schede s where s.id = p_src_id;
  if not found then
    raise exception 'scheda non trovata' using errcode = 'P0002';
  end if;

  insert into public.schede (id, nome, mese, data_inizio, weeks, user_id)
  values (p_new_id, coalesce(nullif(p_nome, ''), v_nome || ' (copia)'), coalesce(p_mese, ''), null, null, v_uid);

  for v_tipo in
    select t.id, t.nome, t.ordine from public.tipi t where t.scheda_id = p_src_id order by t.ordine
  loop
    v_new_tipo := gen_random_uuid()::text;
    insert into public.tipi (id, scheda_id, nome, ordine, user_id)
    values (v_new_tipo, p_new_id, v_tipo.nome, v_tipo.ordine, v_uid);

    v_map := '{}'::jsonb;
    for v_blocco in
      select b.id, b.ordine, b.tipo, b.durata_minuti, b.giri_target, b.nota_comune
      from public.blocchi b where b.tipo_id = v_tipo.id order by b.ordine
    loop
      v_map := v_map || jsonb_build_object(v_blocco.id, gen_random_uuid()::text);
      insert into public.blocchi (id, tipo_id, ordine, tipo, durata_minuti, giri_target, nota_comune, user_id)
      values (v_map ->> v_blocco.id, v_new_tipo, v_blocco.ordine, v_blocco.tipo,
              v_blocco.durata_minuti, v_blocco.giri_target, v_blocco.nota_comune, v_uid);
    end loop;

    insert into public.esercizi (id, tipo_id, blocco_id, titolo, ripetizioni, carico, recupero, note,
                                 ordine, sets_target, exercise_id, rest_seconds, user_id)
    select gen_random_uuid()::text, v_new_tipo, v_map ->> e.blocco_id, e.titolo, e.ripetizioni, e.carico,
           e.recupero, e.note, e.ordine, e.sets_target, e.exercise_id, e.rest_seconds, v_uid
    from public.esercizi e where e.tipo_id = v_tipo.id;
  end loop;

  return p_new_id;
end;
$$;

revoke execute on function public.duplica_scheda(text, text, text, text) from public, anon;
grant execute on function public.duplica_scheda(text, text, text, text) to authenticated;
```

- [ ] **Step 4: Applica, rinomina e rigenera i tipi**

Tool MCP `apply_migration` con `name: "duplica_scheda"` e il contenuto del file. La migration è additiva: è prevista dal design e non serve un ok ulteriore.

Tool MCP `list_migrations` → leggi la versione assegnata.
Run: `git mv supabase/migrations/pending_duplica_scheda.sql supabase/migrations/<versione>_duplica_scheda.sql`

Tool MCP `generate_typescript_types` → sovrascrivi `lib/data/db.types.ts`, mantenendo la riga di intestazione.
Run: `grep -c "duplica_scheda" lib/data/db.types.ts`
Expected: `1` o più.

- [ ] **Step 5: Verifica**

Run: `npm run test:db -- tests/db/duplica.test.ts tests/db/rls.test.ts && npx tsc --noEmit`
Expected: PASS.

Tool MCP `get_advisors` con `type: "security"`.
Expected: nessun avviso nuovo su `duplica_scheda`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations tests/db/duplica.test.ts tests/db/rls.test.ts lib/data/db.types.ts
git commit -F - <<'EOF'
feat(db): RPC duplica_scheda atomica

- copia in una transazione giorni, blocchi (blocco_id rimappato) ed
  esercizi con tutti i campi (sets_target, exercise_id, rest_seconds)
- data_inizio/weeks vuoti; id della copia scelto dal client
- SECURITY INVOKER (RLS), non eseguibile da anon
- test funzionale e test RLS della RPC; tipi DB rigenerati

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 7: Lancia i subagent 2B e 2D**

Crea due worktree da `main` (superpowers:using-git-worktrees):

```bash
git worktree add .claude/worktrees/2b-schede -b ap1/2b-schede
git worktree add .claude/worktrees/2d-weightlogs -b ap1/2d-weightlogs
(cd .claude/worktrees/2b-schede && npm ci)
(cd .claude/worktrees/2d-weightlogs && npm ci)
```

Ai subagent passa:
- al **2B**, i Task 7 e 8;
- al **2D**, il Task 9.

A entrambi passa anche le «Global Constraints» e le convenzioni del Task 4. Intanto, in sessione, procedi con i Task 11 e 12.

---

### Task 7: Modulo schede (subagent 2B)

**Esecuzione:** subagent, nel worktree `.claude/worktrees/2b-schede` (branch `ap1/2b-schede`). Verifica solo con `npx tsc --noEmit` e `npm test`. Il test di parità lo esegue la sessione nel Task 10.

**Files:**
- Create: `lib/data/schede.ts`, `lib/data/schede.test.ts`, `tests/db/parity/schede.test.ts`
- Modify: `lib/data/index.ts`

**Interfaces:**
- Consumes: `Db` e `requireUserId`; `fromPostgrest`; `Scheda`, `SchedaMeta`, `SchedaInput`, `Tipo`, `Blocco`, `BloccoTipo`, `Esercizio`, `EsercizioInput` (`types.ts`); la RPC `duplica_scheda` (Task 6, già nei tipi); `newId()`.
- Produces:
  - in `schede.ts`:
    - i mapping `shapeEsercizio(e): Esercizio`, `shapeSchede(rows: SchedaTreeRow[]): Scheda[]` e `toEsercizioFields(input: EsercizioInput, mode: 'create' | 'update')`;
    - `createSchedeApi(db)`, con `list`, `create`, `update`, `remove`, `duplica`, `createTipo`, `updateTipo`, `removeTipo`, `createEsercizio`, `updateEsercizio`, `removeEsercizio` e `reorderEsercizi`, con le firme della spec §5.3;
  - `dataApi.schede`.

- [ ] **Step 1: Scrivi il test dei mapping**

Create `lib/data/schede.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { shapeSchede, toEsercizioFields, type SchedaTreeRow } from './schede';

const es = (id: string, ordine: number, extra: Record<string, unknown> = {}) => ({
  id, tipo_id: 't1', titolo: id, ripetizioni: '', carico: '', recupero: '', note: '', ordine,
  user_id: 'u', sets_target: null, exercise_id: null, rest_seconds: null, blocco_id: null, ...extra,
});

const rows = [
  {
    id: 'a-vecchia', nome: 'Vecchia', mese: '', user_id: 'u', data_inizio: null, weeks: null, tipi: [],
  },
  {
    id: 'b-nuova', nome: 'Nuova', mese: 'Ott', user_id: 'u', data_inizio: '2026-10-01', weeks: 4,
    tipi: [
      { id: 't2', scheda_id: 'b-nuova', nome: 'Giorno B', ordine: 1, user_id: 'u', esercizi: [], blocchi: [] },
      {
        id: 't1', scheda_id: 'b-nuova', nome: 'Giorno A', ordine: 0, user_id: 'u',
        esercizi: [
          es('squat', 2, { blocco_id: 'bl1' }),
          es('panca', 0, { sets_target: 4, exercise_id: 'x1', rest_seconds: 90 }),
          es('burpee', 1, { blocco_id: 'bl1' }),
        ],
        blocchi: [{
          id: 'bl1', tipo_id: 't1', ordine: 0, tipo: 'circuito_amrap', durata_minuti: 12, giri_target: null,
          nota_comune: null, user_id: 'u', created_at: null,
        }],
      },
    ],
  },
] as unknown as SchedaTreeRow[];

describe('shapeSchede', () => {
  const out = shapeSchede(rows);

  it('ordina le schede per id decrescente', () => {
    expect(out.map(s => s.id)).toEqual(['b-nuova', 'a-vecchia']);
  });

  it('ordina i giorni per ordine e mappa i campi della scheda', () => {
    expect(out[0]).toMatchObject({ nome: 'Nuova', mese: 'Ott', dataInizio: '2026-10-01', weeks: 4 });
    expect(out[0].tipi.map(t => t.nome)).toEqual(['Giorno A', 'Giorno B']);
    expect(out[1]).toEqual({ id: 'a-vecchia', nome: 'Vecchia', mese: '', tipi: [] });
  });

  it('divide gli esercizi tra singoli e blocchi (FIX6), in ordine', () => {
    const a = out[0].tipi[0];
    expect(a.esercizi).toEqual([
      { id: 'panca', titolo: 'panca', ripetizioni: '', carico: '', recupero: '', note: '', setsTarget: 4, exerciseId: 'x1', restSeconds: 90 },
    ]);
    expect(a.blocchi).toEqual([{
      id: 'bl1', tipo: 'circuito_amrap', durataMinuti: 12, esercizi: [
        { id: 'burpee', titolo: 'burpee', ripetizioni: '', carico: '', recupero: '', note: '', bloccoId: 'bl1' },
        { id: 'squat', titolo: 'squat', ripetizioni: '', carico: '', recupero: '', note: '', bloccoId: 'bl1' },
      ],
    }]);
  });
});

describe('toEsercizioFields', () => {
  const base = { titolo: 'Panca', ripetizioni: '4x8', carico: '', recupero: '', note: '' };

  it('create: sets_target sempre presente (null se manca)', () => {
    expect(toEsercizioFields(base, 'create')).toEqual({ ...base, sets_target: null });
  });

  it('update: sets_target, exercise_id, rest_seconds solo se presenti', () => {
    expect(toEsercizioFields(base, 'update')).toEqual(base);
    expect(toEsercizioFields({ ...base, setsTarget: 3, restSeconds: 60, exerciseId: 'x' }, 'update'))
      .toEqual({ ...base, sets_target: 3, rest_seconds: 60, exercise_id: 'x' });
  });

  it('stringhe mancanti → stringa vuota', () => {
    expect(toEsercizioFields({ titolo: '', ripetizioni: '', carico: '', recupero: '', note: '' }, 'update').titolo).toBe('');
  });
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npm test`
Expected: FAIL per `schede.test.ts` (modulo mancante).

- [ ] **Step 3: Implementa `schede.ts`**

Create `lib/data/schede.ts`:

```ts
// Schede sul livello dati (AP1 Fase 2): stessa logica di app/api/schede/**.
// La duplica usa la RPC atomica duplica_scheda.
import { newId } from '@/lib/utils';
import type { Tables, TablesInsert, TablesUpdate } from './db.types';
import { fromPostgrest } from './errors';
import { requireUserId, type Db } from './session';
import type {
  Blocco, BloccoTipo, Esercizio, EsercizioInput, Scheda, SchedaInput, SchedaMeta, Tipo,
} from './types';

type EsercizioRow = Tables<'esercizi'>;
type TipoTreeRow = Tables<'tipi'> & { esercizi: EsercizioRow[] | null; blocchi: Tables<'blocchi'>[] | null };
export type SchedaTreeRow = Tables<'schede'> & { tipi: TipoTreeRow[] | null };

const TREE = '*, tipi(*, esercizi(*), blocchi(*))';
const byOrdine = (a: { ordine: number | null }, b: { ordine: number | null }) => (a.ordine ?? 0) - (b.ordine ?? 0);

/** Riga esercizio → Esercizio (default della vecchia GET /api/schede). */
export function shapeEsercizio(e: Pick<EsercizioRow, 'id'> & Partial<EsercizioRow>): Esercizio {
  return {
    id: e.id,
    titolo: e.titolo ?? '',
    ripetizioni: e.ripetizioni ?? '',
    carico: e.carico ?? '',
    recupero: e.recupero ?? '',
    note: e.note ?? '',
    setsTarget: e.sets_target ?? undefined,
    exerciseId: e.exercise_id ?? undefined,
    restSeconds: e.rest_seconds ?? undefined,
    bloccoId: e.blocco_id ?? undefined,
  };
}

/**
 * Albero DB → Scheda[]: schede per id decrescente (gli id sono time-sortable); giorni,
 * blocchi ed esercizi per `ordine`; esercizi divisi tra singoli (blocco_id null) e blocchi.
 */
export function shapeSchede(rows: SchedaTreeRow[]): Scheda[] {
  return rows.slice().sort((a, b) => b.id.localeCompare(a.id)).map(s => ({
    id: s.id,
    nome: s.nome ?? '',
    mese: s.mese ?? '',
    dataInizio: s.data_inizio ?? undefined,
    weeks: s.weeks ?? undefined,
    tipi: (s.tipi ?? []).slice().sort(byOrdine).map((t): Tipo => {
      const allEs = (t.esercizi ?? []).slice().sort(byOrdine);
      return {
        id: t.id,
        nome: t.nome,
        esercizi: allEs.filter(e => !e.blocco_id).map(shapeEsercizio),
        blocchi: (t.blocchi ?? []).slice().sort(byOrdine).map((b): Blocco => ({
          id: b.id,
          tipo: (b.tipo ?? 'circuito_amrap') as BloccoTipo,
          durataMinuti: b.durata_minuti ?? undefined,
          giriTarget: b.giri_target ?? undefined,
          notaComune: b.nota_comune ?? undefined,
          esercizi: allEs.filter(e => e.blocco_id === b.id).map(shapeEsercizio),
        })),
      };
    }),
  }));
}

/** Campi scrivibili di un esercizio, come la vecchia route (POST = create, PUT = update). */
export function toEsercizioFields(input: EsercizioInput, mode: 'create' | 'update'): TablesUpdate<'esercizi'> {
  const row: TablesUpdate<'esercizi'> = {
    titolo: input.titolo || '',
    ripetizioni: input.ripetizioni || '',
    carico: input.carico || '',
    recupero: input.recupero || '',
    note: input.note || '',
  };
  if (mode === 'create') row.sets_target = input.setsTarget ?? null;
  else if (input.setsTarget !== undefined) row.sets_target = input.setsTarget ?? null;
  if (input.exerciseId !== undefined) row.exercise_id = input.exerciseId ?? null;
  if (input.restSeconds !== undefined) row.rest_seconds = input.restSeconds ?? null;
  return row;
}

/** Le route di create/update esercizio non restituivano bloccoId. */
function withoutBlocco({ bloccoId: _ignored, ...esercizio }: Esercizio): Esercizio {
  return esercizio;
}

export function createSchedeApi(db: Db) {
  return {
    async list(): Promise<Scheda[]> {
      await requireUserId(db);
      const { data, error } = await db.from('schede').select(TREE);
      if (error) throw fromPostgrest(error);
      return shapeSchede((data ?? []) as unknown as SchedaTreeRow[]);
    },

    async create(input: SchedaInput, opts: { id?: string } = {}): Promise<Scheda> {
      const userId = await requireUserId(db);
      const row: TablesInsert<'schede'> = {
        id: opts.id ?? newId(),
        nome: input.nome || '',
        mese: input.mese || '',
        data_inizio: input.dataInizio ?? null,
        weeks: input.weeks ?? null,
        user_id: userId,
      };
      const { error } = await db.from('schede').insert(row);
      if (error) throw fromPostgrest(error);
      return {
        id: row.id, nome: row.nome ?? '', mese: row.mese ?? '',
        dataInizio: row.data_inizio ?? undefined, weeks: row.weeks ?? undefined, tipi: [],
      };
    },

    async update(id: string, input: SchedaInput): Promise<SchedaMeta> {
      await requireUserId(db);
      const patch: TablesUpdate<'schede'> = { nome: input.nome || '', mese: input.mese || '' };
      if (input.dataInizio !== undefined) patch.data_inizio = input.dataInizio || null;
      if (input.weeks !== undefined) patch.weeks = input.weeks ?? null;
      const { data, error } = await db.from('schede').update(patch).eq('id', id).select().single();
      if (error) throw fromPostgrest(error);
      return {
        id: data.id, nome: data.nome ?? '', mese: data.mese ?? '',
        dataInizio: data.data_inizio ?? undefined, weeks: data.weeks ?? undefined,
      };
    },

    async remove(id: string): Promise<void> {
      await requireUserId(db);
      const { error } = await db.from('schede').delete().eq('id', id);
      if (error) throw fromPostgrest(error);
    },

    /** Duplica atomica (RPC). Restituisce l'id della copia. */
    async duplica(srcId: string, input: { nome: string; mese: string }): Promise<string> {
      await requireUserId(db);
      const { data, error } = await db.rpc('duplica_scheda', {
        p_src_id: srcId, p_new_id: newId(), p_nome: input.nome, p_mese: input.mese,
      });
      if (error) throw fromPostgrest(error);
      return data as string;
    },

    async createTipo(schedaId: string, nome: string): Promise<Tipo> {
      const userId = await requireUserId(db);
      const { data: existing, error: readErr } = await db.from('tipi').select('ordine').eq('scheda_id', schedaId);
      if (readErr) throw fromPostgrest(readErr);
      const maxOrdine = existing && existing.length ? Math.max(...existing.map(t => t.ordine)) : -1;
      const row: TablesInsert<'tipi'> = { id: newId(), scheda_id: schedaId, nome: nome || '', ordine: maxOrdine + 1, user_id: userId };
      const { error } = await db.from('tipi').insert(row);
      if (error) throw fromPostgrest(error);
      return { id: row.id, nome: row.nome ?? '', esercizi: [], blocchi: [] };
    },

    async updateTipo(schedaId: string, tipoId: string, nome: string): Promise<void> {
      await requireUserId(db);
      const { error } = await db.from('tipi').update({ nome: nome || '' })
        .eq('id', tipoId).eq('scheda_id', schedaId).select().single();
      if (error) throw fromPostgrest(error);
    },

    async removeTipo(tipoId: string): Promise<void> {
      await requireUserId(db);
      const { error } = await db.from('tipi').delete().eq('id', tipoId);
      if (error) throw fromPostgrest(error);
    },

    async createEsercizio(tipoId: string, input: EsercizioInput): Promise<Esercizio> {
      const userId = await requireUserId(db);
      const { data: existing, error: readErr } = await db.from('esercizi').select('ordine').eq('tipo_id', tipoId);
      if (readErr) throw fromPostgrest(readErr);
      const maxOrdine = existing && existing.length ? Math.max(...existing.map(e => e.ordine)) : -1;
      const row: TablesInsert<'esercizi'> = {
        id: newId(), tipo_id: tipoId, ...toEsercizioFields(input, 'create'), ordine: maxOrdine + 1, user_id: userId,
      };
      const { error } = await db.from('esercizi').insert(row);
      if (error) throw fromPostgrest(error);
      return withoutBlocco(shapeEsercizio(row));
    },

    async updateEsercizio(esId: string, input: EsercizioInput): Promise<Esercizio> {
      await requireUserId(db);
      const { data, error } = await db.from('esercizi').update(toEsercizioFields(input, 'update'))
        .eq('id', esId).select().single();
      if (error) throw fromPostgrest(error);
      return withoutBlocco(shapeEsercizio(data));
    },

    async removeEsercizio(esId: string): Promise<void> {
      await requireUserId(db);
      const { error } = await db.from('esercizi').delete().eq('id', esId);
      if (error) throw fromPostgrest(error);
    },

    /** N update in parallelo, come la vecchia route (non atomico). */
    async reorderEsercizi(orderedIds: string[]): Promise<void> {
      await requireUserId(db);
      const results = await Promise.all(
        orderedIds.map((id, idx) => db.from('esercizi').update({ ordine: idx }).eq('id', id)),
      );
      const failed = results.find(r => r.error);
      if (failed?.error) throw fromPostgrest(failed.error);
    },
  };
}

export type SchedeApi = ReturnType<typeof createSchedeApi>;
```

In `lib/data/index.ts` aggiungi `import { createSchedeApi } from './schede';` e, nell'oggetto restituito da `createDataApi`, la riga `schede: createSchedeApi(db),`.

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npm test && npx tsc --noEmit`
Expected: PASS, compresi i 6 test di `schede`, e nessun errore TypeScript.

- [ ] **Step 5: Scrivi il test di parità (lo esegue la sessione nel Task 10)**

Create `tests/db/parity/schede.test.ts`:

```ts
// Parità temporanea (fino a P4): vecchie route schede ↔ livello dati, stesso utente di test.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GET as routeList, POST as routeCreate } from '@/app/api/schede/route';
import { PUT as routeUpdate } from '@/app/api/schede/[id]/route';
import { POST as routeCreateTipo } from '@/app/api/schede/[id]/tipi/route';
import { PUT as routeUpdateTipo } from '@/app/api/schede/[id]/tipi/[tipoId]/route';
import { POST as routeCreateEs } from '@/app/api/schede/[id]/tipi/[tipoId]/esercizi/route';
import { PUT as routeUpdateEs } from '@/app/api/schede/[id]/tipi/[tipoId]/esercizi/[esId]/route';
import { PUT as routeReorder } from '@/app/api/schede/[id]/tipi/[tipoId]/reorder/route';
import { createDataApi } from '@/lib/data';
import type { Db } from '@/lib/data/session';
import { cleanupMarked, MARK, signIn, type TestUser } from '../helpers';

let u1: TestUser;

const req = (method: string, body?: unknown) =>
  new Request('http://parity.test/api', {
    method,
    headers: { authorization: `Bearer ${u1.token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const withoutId = <T extends { id: string }>({ id: _id, ...rest }: T) => rest;
const sameButName = <T extends { id: string; nome: string }>(o: T) => ({ ...withoutId(o), nome: '' });

beforeAll(async () => {
  u1 = await signIn(1);
  await cleanupMarked([u1]);
});

afterAll(async () => {
  if (u1) await cleanupMarked([u1]);
});

describe('parità schede: vecchie route ↔ livello dati', () => {
  it('create, update, giorni, esercizi, riordino e lista', async () => {
    const api = createDataApi(u1.db as unknown as Db);

    const sR = await (await routeCreate(req('POST', { nome: `${MARK} R`, mese: 'Ott' }))).json();
    const sD = await api.schede.create({ nome: `${MARK} D`, mese: 'Ott' });
    expect(sameButName(sD)).toEqual(sameButName(sR));

    const uR = await (await routeUpdate(req('PUT', { nome: `${MARK} R`, mese: 'Nov', weeks: 4 }), params({ id: sR.id }))).json();
    const uD = await api.schede.update(sD.id, { nome: `${MARK} D`, mese: 'Nov', weeks: 4 });
    expect(sameButName(uD)).toEqual(sameButName(uR));

    const tR = await (await routeCreateTipo(req('POST', { nome: 'Giorno A' }), params({ id: sR.id }))).json();
    const tD = await api.schede.createTipo(sD.id, 'Giorno A');
    expect(withoutId(tD)).toEqual(withoutId(tR));
    await routeUpdateTipo(req('PUT', { nome: 'Giorno A1' }), params({ id: sR.id, tipoId: tR.id }));
    await api.schede.updateTipo(sD.id, tD.id, 'Giorno A1');

    const esInput = { titolo: 'Panca', ripetizioni: '4x8', carico: '80kg', recupero: '90s', note: '', setsTarget: 4, restSeconds: 90 };
    const e1R = await (await routeCreateEs(req('POST', esInput), params({ id: sR.id, tipoId: tR.id }))).json();
    const e1D = await api.schede.createEsercizio(tD.id, esInput);
    expect(withoutId(e1D)).toEqual(withoutId(e1R));
    const e2R = await (await routeCreateEs(req('POST', { ...esInput, titolo: 'Squat' }), params({ id: sR.id, tipoId: tR.id }))).json();
    const e2D = await api.schede.createEsercizio(tD.id, { ...esInput, titolo: 'Squat' });

    const upd = { ...esInput, carico: '85kg', setsTarget: 5 };
    const ueR = await (await routeUpdateEs(req('PUT', upd), params({ id: sR.id, tipoId: tR.id, esId: e1R.id }))).json();
    const ueD = await api.schede.updateEsercizio(e1D.id, upd);
    expect(withoutId(ueD)).toEqual(withoutId(ueR));

    await routeReorder(req('PUT', { ordine: [e2R.id, e1R.id] }), params({ id: sR.id, tipoId: tR.id }));
    await api.schede.reorderEsercizi([e2D.id, e1D.id]);

    // stessa lettura, stesso JSON (ordinamento compreso)
    const listR = await (await routeList(req('GET'))).json();
    const listD = await api.schede.list();
    expect(listD).toEqual(listR);

    // le due schede hanno subito le stesse modifiche
    const tree = (list: any[], id: string) => {
      const s = list.find(x => x.id === id);
      return { mese: s.mese, weeks: s.weeks, tipi: s.tipi.map((t: any) => ({ nome: t.nome, esercizi: t.esercizi.map(withoutId), blocchi: t.blocchi })) };
    };
    expect(tree(listD, sD.id)).toEqual(tree(listR, sR.id));
  });
});
```

- [ ] **Step 6: Commit (nel worktree)**

```bash
git add lib/data/schede.ts lib/data/schede.test.ts lib/data/index.ts tests/db/parity/schede.test.ts
git commit -F - <<'EOF'
feat(data): schede sul livello dati, duplica via RPC

- mapping puri (albero FIX6, esercizi) testati
- createSchedeApi: CRUD di schede, giorni ed esercizi, riordino, duplica
  atomica (RPC duplica_scheda)
- test di parità con le route /api/schede/** (eseguito al merge)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Archivio sul livello dati (subagent 2B)

**Esecuzione:** subagent, stesso worktree del Task 7.

**Files:**
- Modify: `app/(app)/schede/archivio/page.tsx` (handler CRUD, duplica, riordino: righe 102–171), `providers/AppProvider.tsx` (`loadSchede`)

**Interfaces:**
- Consumes: `dataApi.schede` (Task 7) e `toDataError`.
- Produces: nessun call site che usi `/api/schede` (l'import PDF resta su `apiFetch` fino al Task 15).

- [ ] **Step 1: `AppProvider.loadSchede`**

`import { dataApi } from '@/lib/data';` c'è già, dal Task 5. Sostituisci `loadSchede` con:

```ts
  const loadSchede = useCallback(async () => {
    if (!authToken) return;
    try {
      setSchede(await dataApi.schede.list());
    } catch (err) {
      console.error('[loadSchede]', err);
    }
  }, [authToken]);
```

- [ ] **Step 2: Handler dell'archivio**

In `app/(app)/schede/archivio/page.tsx`:
- aggiungi `import { dataApi, toDataError } from '@/lib/data';`;
- la riga di `useApp()` **resta invariata**: `apiFetch` serve ancora all'import PDF;
- sostituisci tutto il blocco da `// ─── Scheda CRUD ───` fino alla `}` di `saveReorder` con:

```ts
  // AP1 Fase 2: operazioni sul livello dati. In caso di errore compare un toast
  // (prima gli errori venivano ignorati in silenzio).
  async function attempt(op: () => Promise<unknown>, errMsg: string): Promise<void> {
    try {
      await op();
    } catch (err) {
      toast(`${errMsg} — ${toDataError(err).message}`, 'error');
    }
  }

  // ─── Scheda CRUD ──────────────────────────────────────────────
  async function saveScheda(nome: string, mese: string) {
    const m = modal as { type: 'scheda'; schedaId?: string };
    await attempt(
      () => (m.schedaId ? dataApi.schede.update(m.schedaId, { nome, mese }) : dataApi.schede.create({ nome, mese })),
      'Salvataggio della scheda non riuscito',
    );
    await loadSchede();
    setModal(null);
  }

  async function confirmDuplica(nome: string, mese: string) {
    const m = modal as { type: 'duplica'; schedaId: string };
    await attempt(() => dataApi.schede.duplica(m.schedaId, { nome, mese }), 'Duplicazione non riuscita');
    await loadSchede();
    setModal(null);
  }

  async function deleteScheda(id: string) {
    await attempt(() => dataApi.schede.remove(id), 'Eliminazione della scheda non riuscita');
    await loadSchede();
  }

  // ─── Tipo CRUD ────────────────────────────────────────────────
  async function saveTipo(nome: string) {
    const m = modal as { type: 'tipo'; schedaId: string; tipoId?: string };
    await attempt(
      () => (m.tipoId ? dataApi.schede.updateTipo(m.schedaId, m.tipoId, nome) : dataApi.schede.createTipo(m.schedaId, nome)),
      'Salvataggio del giorno non riuscito',
    );
    await loadSchede();
    setModal(null);
  }

  async function deleteTipo(schedaId: string, tipoId: string) {
    await attempt(() => dataApi.schede.removeTipo(tipoId), 'Eliminazione del giorno non riuscita');
    await loadSchede();
  }

  // ─── Esercizio CRUD ───────────────────────────────────────────
  async function saveEsercizio(data: Omit<Esercizio, 'id'>) {
    const m = modal as { type: 'esercizio'; schedaId: string; tipoId: string; esId?: string };
    await attempt(
      () => (m.esId ? dataApi.schede.updateEsercizio(m.esId, data) : dataApi.schede.createEsercizio(m.tipoId, data)),
      "Salvataggio dell'esercizio non riuscito",
    );
    await loadSchede();
    setModal(null);
  }

  async function deleteEsercizio(schedaId: string, tipoId: string, esId: string) {
    await attempt(() => dataApi.schede.removeEsercizio(esId), "Eliminazione dell'esercizio non riuscita");
    await loadSchede();
  }

  // ─── Riordino esercizi (R4: modal con frecce, ex drag&drop) ───
  // Persistenza una-tantum alla conferma: l'ordine viene riordinato in memoria
  // nel ReorderModal e arriva qui come lista di id già ordinata.
  async function saveReorder(schedaId: string, tipoId: string, orderedIds: string[]) {
    await attempt(() => dataApi.schede.reorderEsercizi(orderedIds), 'Riordino non riuscito');
    await loadSchede();
    setModal(null);
  }
```

- [ ] **Step 3: Nessun call site residuo per le schede**

Run: `grep -rn "/api/schede" app components lib providers --include='*.ts' --include='*.tsx' | grep -v '^app/api/'`
Expected: nessun output.

- [ ] **Step 4: Verifica**

Run: `npx tsc --noEmit && npm test`
Expected: tutto verde.

- [ ] **Step 5: Commit (nel worktree)**

```bash
git add "app/(app)/schede/archivio/page.tsx" providers/AppProvider.tsx
git commit -F - <<'EOF'
feat(data): archivio schede sul livello dati

- loadSchede e i CRUD di schede, giorni ed esercizi, riordino e duplica
  passano da dataApi.schede
- errori mostrati con un toast (prima ignorati in silenzio)
- l'import PDF resta sulla vecchia route fino alla Edge Function

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 9: Weight-logs (subagent 2D)

**Esecuzione:** subagent, nel worktree `.claude/worktrees/2d-weightlogs` (branch `ap1/2d-weightlogs`). Verifica solo con `npx tsc --noEmit` e `npm test`. Il test di parità lo esegue la sessione nel Task 10.

**Files:**
- Create: `lib/data/weightLogs.ts`, `lib/data/weightLogs.test.ts`, `tests/db/parity/weightLogs.test.ts`
- Modify: `lib/data/index.ts`, `providers/AppProvider.tsx` (`loadWeightLogs`), `components/modals/StoricoPesiModal.tsx:27,71-82`

**Interfaces:**
- Consumes: `Db` e `requireUserId`; `fromPostgrest`; `WeightLog` e `WeightLogInput`; `newId()`.
- Produces: in `weightLogs.ts`, `shapeWeightLog(r): WeightLog` e `createWeightLogsApi(db)`, con `list(): Promise<WeightLog[]>`, `create(input: WeightLogInput, opts?: { id?: string }): Promise<WeightLog>` e `remove(id: string): Promise<void>`; `dataApi.weightLogs`.

- [ ] **Step 1: Scrivi il test del mapping**

Create `lib/data/weightLogs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { shapeWeightLog } from './weightLogs';

describe('shapeWeightLog', () => {
  it('es_nome → esNome, e solo i campi del dominio', () => {
    const row = { id: 'w1', date: '2026-10-01', es_nome: 'Panca', carico: '80kg', note: 'ok', user_id: 'u' };
    expect(shapeWeightLog(row)).toEqual({ id: 'w1', date: '2026-10-01', esNome: 'Panca', carico: '80kg', note: 'ok' });
  });
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npm test`
Expected: FAIL per `weightLogs.test.ts` (modulo mancante).

- [ ] **Step 3: Implementa `weightLogs.ts` e collegalo**

Create `lib/data/weightLogs.ts`:

```ts
// Storico pesi sul livello dati (AP1 Fase 2): stessa logica di app/api/weight-logs.
import { newId } from '@/lib/utils';
import type { Tables, TablesInsert } from './db.types';
import { fromPostgrest } from './errors';
import { requireUserId, type Db } from './session';
import type { WeightLog, WeightLogInput } from './types';

type WeightLogRow = Tables<'weight_logs'>;
type WeightLogFields = Pick<WeightLogRow, 'id' | 'date' | 'es_nome' | 'carico' | 'note'>;

export function shapeWeightLog(r: WeightLogFields): WeightLog {
  return { id: r.id, date: r.date, esNome: r.es_nome, carico: r.carico, note: r.note };
}

export function createWeightLogsApi(db: Db) {
  return {
    async list(): Promise<WeightLog[]> {
      await requireUserId(db);
      const { data, error } = await db.from('weight_logs').select('*').order('date');
      if (error) throw fromPostgrest(error);
      return (data ?? []).map(shapeWeightLog);
    },

    async create(input: WeightLogInput, opts: { id?: string } = {}): Promise<WeightLog> {
      const userId = await requireUserId(db);
      const row: TablesInsert<'weight_logs'> & WeightLogFields = {
        id: opts.id ?? newId(),
        date: input.date,
        es_nome: input.esNome || '',
        carico: input.carico || '',
        note: input.note || '',
        user_id: userId,
      };
      const { error } = await db.from('weight_logs').insert(row);
      if (error) throw fromPostgrest(error);
      return shapeWeightLog(row);
    },

    async remove(id: string): Promise<void> {
      await requireUserId(db);
      const { error } = await db.from('weight_logs').delete().eq('id', id);
      if (error) throw fromPostgrest(error);
    },
  };
}

export type WeightLogsApi = ReturnType<typeof createWeightLogsApi>;
```

In `lib/data/index.ts` aggiungi `import { createWeightLogsApi } from './weightLogs';` e, nell'oggetto di `createDataApi`, la riga `weightLogs: createWeightLogsApi(db),`.

In `providers/AppProvider.tsx` sostituisci `loadWeightLogs` con:

```ts
  const loadWeightLogs = useCallback(async () => {
    if (!authToken) return;
    try {
      setWeightLogs(await dataApi.weightLogs.list());
    } catch (err) {
      console.error('[loadWeightLogs]', err);
    }
  }, [authToken]);
```

(Aggiungi `import { dataApi } from '@/lib/data';` se nel worktree non c'è già: c'è, dal Task 5.)

In `components/modals/StoricoPesiModal.tsx`:
- aggiungi `import { dataApi, toDataError } from '@/lib/data';`;
- la riga 27 diventa `const { weightLogs, loadWeightLogs, toast } = useApp();`;
- `addLog` e `deleteLog` diventano:

```ts
  async function addLog() {
    if (!carico) return;
    try {
      await dataApi.weightLogs.create({ date, esNome, carico, note });
    } catch (err) {
      toast(`Salvataggio del peso non riuscito — ${toDataError(err).message}`, 'error');
      return;
    }
    await loadWeightLogs();
    setCarico(''); setNote('');
  }

  async function deleteLog(id: string) {
    try {
      await dataApi.weightLogs.remove(id);
    } catch (err) {
      toast(`Eliminazione non riuscita — ${toDataError(err).message}`, 'error');
    }
    await loadWeightLogs();
  }
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npm test && npx tsc --noEmit`
Expected: PASS e nessun errore TypeScript.

Run: `grep -rn "/api/weight-logs" app components lib providers --include='*.ts' --include='*.tsx' | grep -v '^app/api/'`
Expected: nessun output.

- [ ] **Step 5: Scrivi il test di parità (lo esegue la sessione nel Task 10)**

Create `tests/db/parity/weightLogs.test.ts`:

```ts
// Parità temporanea (fino a P4): vecchie route weight-logs ↔ livello dati.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GET as routeList, POST as routeCreate } from '@/app/api/weight-logs/route';
import { createDataApi } from '@/lib/data';
import type { Db } from '@/lib/data/session';
import { cleanupMarked, MARK, signIn, type TestUser } from '../helpers';

let u1: TestUser;

const req = (method: string, body?: unknown) =>
  new Request('http://parity.test/api', {
    method,
    headers: { authorization: `Bearer ${u1.token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
// La vecchia route restituiva anche user_id: il confronto è sui campi del dominio.
const domain = (w: any) => ({ id: w.id, date: w.date, esNome: w.esNome, carico: w.carico, note: w.note });
const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);

beforeAll(async () => {
  u1 = await signIn(1);
  await cleanupMarked([u1]);
});

afterAll(async () => {
  if (u1) await cleanupMarked([u1]);
});

describe('parità weight-logs: vecchie route ↔ livello dati', () => {
  it('create e list', async () => {
    const api = createDataApi(u1.db as unknown as Db);
    const input = { date: '2026-01-03', esNome: `${MARK} panca`, carico: '80kg', note: 'p' };

    const r = await (await routeCreate(req('POST', input))).json();
    const d = await api.weightLogs.create(input);
    expect({ ...domain(d), id: '' }).toEqual({ ...domain(r), id: '' });

    const listR: any[] = await (await routeList(req('GET'))).json();
    const listD = await api.weightLogs.list();
    expect([...listD].sort(byId)).toEqual(listR.map(domain).sort(byId));
    const dates = listD.map(w => w.date);
    expect(dates).toEqual([...dates].sort()); // ordinati per data, come la route
  });
});
```

- [ ] **Step 6: Commit (nel worktree)**

```bash
git add lib/data/weightLogs.ts lib/data/weightLogs.test.ts lib/data/index.ts providers/AppProvider.tsx components/modals/StoricoPesiModal.tsx tests/db/parity/weightLogs.test.ts
git commit -F - <<'EOF'
feat(data): storico pesi sul livello dati

- createWeightLogsApi: list/create/remove su supabase-js (RLS)
- StoricoPesiModal e loadWeightLogs passano da dataApi.weightLogs, con
  toast d'errore (prima ignorati)
- test di parità con /api/weight-logs (eseguito al merge)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 10: Merge di 2B e 2D, cancello P2 e push

**Esecuzione:** sessione.

**Files:**
- Merge: `ap1/2b-schede`, `ap1/2d-weightlogs` → `main`

- [ ] **Step 1: Merge**

Run:
```bash
git merge --no-ff ap1/2b-schede -m "merge: 2B schede sul livello dati"
git merge --no-ff ap1/2d-weightlogs -m "merge: 2D storico pesi sul livello dati"
```
Expected: conflitti, se ci sono, solo in `lib/data/index.ts` (import e voci di `createDataApi`) e in `providers/AppProvider.tsx` (loader adiacenti). Risolvili tenendo entrambe le modifiche: `index.ts` deve contenere `workouts`, `schede` e `weightLogs`. Dopo ogni risoluzione: `git add` dei file e `git commit --no-edit`.

- [ ] **Step 2: Cancello automatico, parità compresa**

Run: `npm install && npx tsc --noEmit && npm run build && npm test && npm run test:db`
Expected: tutto verde: RLS, duplica e parità di workouts, schede e weight-logs. Se una parità fallisce: correggi il modulo (non il test) e committa la correzione.

- [ ] **Step 3: Prova manuale P2 (Fabrizio)**

Avvia il server con `npm start` in background e manda:

> **Prova manuale P2** (build locale, utente di test 1)
> 1. **Flusso Live completo**, come in P1 (salvataggio compreso).
> 2. **Archivio:**
>    - crea una scheda, rinominala ed eliminala;
>    - in un'altra scheda crea un giorno, rinominalo ed eliminalo;
>    - crea un esercizio, modificalo (carico e serie) ed eliminalo;
>    - riordina gli esercizi di un giorno.
> 3. **Duplica** una scheda che abbia un blocco AMRAP. La copia deve avere giorni, blocchi ed esercizi con gli stessi valori (serie, recupero, carico). Data di inizio e settimane devono essere vuote.
> 4. **Storico pesi** (dall'icona dello storico di un esercizio): aggiungi un peso, poi eliminalo.
> 5. Elimina le schede e gli allenamenti di prova.
>
> Rispondi «ok P2», oppure dimmi a che passo qualcosa non va.

Expected: «ok P2». Poi `lsof -ti tcp:3000 | xargs kill`.

- [ ] **Step 4: Push P2 e pulizia dei worktree**

Run:
```bash
git push
git worktree remove .claude/worktrees/2b-schede
git worktree remove .claude/worktrees/2d-weightlogs
git branch -d ap1/2b-schede ap1/2d-weightlogs
```
Expected: push `main -> main`; worktree e branch rimossi. Dopo 2–3 minuti, `curl` su `https://allenamenti-app.vercel.app/login` → `200`.

---

## Passo 2C/3 — import-pdf su Edge Function → push P3

### Task 11: Tabella `ai_usage`

**Esecuzione:** sessione. Si può fare mentre i subagent 2B e 2D lavorano.

**Files:**
- Create: `supabase/migrations/pending_ai_usage.sql` (da rinominare)
- Modify: `tests/db/rls.test.ts`, `lib/data/db.types.ts` (rigenerato)

**Interfaces:**
- Produces: tabella `public.ai_usage(id bigint, user_id uuid default auth.uid(), fn text, created_at timestamptz)`, con RLS «leggi e inserisci solo righe tue» e senza update né delete.

- [ ] **Step 1: Scrivi i test RLS di `ai_usage`**

Aggiungi in fondo a `tests/db/rls.test.ts`:

```ts
// Le righe 'rls-test' di ai_usage restano (dal client non si cancellano, per design) e non
// contano per il limite di import, che filtra fn = 'import-pdf'.
describe('RLS: ai_usage', () => {
  it("l'utente 1 non vede le righe dell'utente 2", async () => {
    const ins = await u2.db.from('ai_usage').insert({ fn: 'rls-test' }).select('id').single();
    expect(ins.error).toBeNull();
    const { data } = await u1.db.from('ai_usage').select('id').eq('id', ins.data!.id);
    expect(data).toEqual([]);
  });

  it('update e delete delle proprie righe non toccano nulla', async () => {
    const ins = await u1.db.from('ai_usage').insert({ fn: 'rls-test' }).select('id').single();
    expect(ins.error).toBeNull();
    const up = await u1.db.from('ai_usage').update({ fn: 'hack' }).eq('id', ins.data!.id).select('id');
    expect(up.data).toEqual([]);
    const del = await u1.db.from('ai_usage').delete().eq('id', ins.data!.id).select('id');
    expect(del.data).toEqual([]);
  });

  it("non si inserisce a nome dell'utente 2", async () => {
    const { error } = await u1.db.from('ai_usage').insert({ fn: 'rls-test', user_id: u2.id });
    expect(error?.code).toBe('42501');
  });
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npm run test:rls`
Expected: FAIL nei test di `ai_usage`: la tabella non esiste (`PGRST205` o `42P01`).

- [ ] **Step 3: Scrivi e applica la migration**

Create `supabase/migrations/pending_ai_usage.sql`:

```sql
-- AP1 Fase 2: contatore delle chiamate AI per utente (limite import-pdf).
-- Ognuno legge e inserisce solo le proprie righe; niente update/delete:
-- il contatore non si azzera dal client.
create table public.ai_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fn         text not null,
  created_at timestamptz not null default now()
);

create index ai_usage_user_fn_created_idx on public.ai_usage (user_id, fn, created_at desc);

alter table public.ai_usage enable row level security;

create policy "ai_usage: lettura proprie righe" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "ai_usage: inserimento proprie righe" on public.ai_usage
  for insert to authenticated with check ((select auth.uid()) = user_id);
```

Tool MCP `apply_migration` con `name: "ai_usage"`. Poi `list_migrations`, `git mv` in `<versione>_ai_usage.sql`, `generate_typescript_types` e sovrascrivi `lib/data/db.types.ts`, mantenendo la riga di intestazione.

- [ ] **Step 4: Verifica**

Run: `npm run test:rls && npx tsc --noEmit`
Expected: PASS.

Tool MCP `get_advisors` con `type: "security"`.
Expected: nessun avviso su `ai_usage`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations tests/db/rls.test.ts lib/data/db.types.ts
git commit -F - <<'EOF'
feat(db): tabella ai_usage per il limite di import-pdf

- una riga per tentativo di import; RLS: lettura e inserimento solo delle
  proprie righe, niente update/delete
- test RLS; tipi DB rigenerati

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 12: Spike di import-pdf

**Esecuzione:** sessione. Serve il secret `ANTHROPIC_API_KEY_EDGE` impostato da Fabrizio, più i percorsi dei PDF. Il task termina con una **decisione di Fabrizio**.

**Nota:** la spec (§9.2) prevede due moduli, `parse.ts` e `rows.ts`. Qui stanno in un solo `core.ts` senza import: Deno vuole l'estensione `.ts` negli import relativi, mentre il `tsc` di Next la rifiuta. Un modulo senza import evita il conflitto. Parse e scrittura restano funzioni separate (`normalizeScheda`, `buildImportRows`), come chiede la spec per il riuso in MNGMT1.

**Files:**
- Create: `supabase/functions/import-pdf/core.ts`, `supabase/functions/import-pdf/core.test.ts`, `supabase/functions/import-pdf/prompt.ts`, `supabase/functions/import-pdf/config.ts`, `supabase/functions/import-pdf/index.ts` (versione spike), `scripts/spike-import-pdf.mjs`, `docs/superpowers/notes/ap1-spike-import-pdf.md`
- Modify: `tsconfig.json` (`exclude`)

**Interfaces:**
- Produces:
  - in `core.ts`, puro e senza import:
    - i tipi `BloccoTipo`, `ParsedEsercizio`, `ParsedBlocco`, `ParsedTipo`, `ParsedScheda` e la classe `ParseError`;
    - le funzioni `extractJson(rawText: string): unknown`, `normalizeScheda(parsed: unknown, fileName: string): ParsedScheda`, `toIntOrNull(v: unknown): number | null`, `isPdf(bytes: Uint8Array): boolean`, `toBase64(bytes: Uint8Array): string` e `newId(): string`;
  - in `prompt.ts`: `IMPORT_PROMPT: string`;
  - in `config.ts`: le costanti del §9.2 della spec, più `SPIKE_MODELS`, che esiste solo nello spike.

- [ ] **Step 1: Escludi il codice Deno dal type-check di Next**

In `tsconfig.json` il blocco `exclude` diventa:

```json
  "exclude": [
    "node_modules",
    "docs",
    "supabase/functions/**/index.ts"
  ]
```

Si esclude solo `index.ts`, che usa API Deno e import `npm:`. `core.ts`, `config.ts` e `prompt.ts` non hanno import e restano controllati da `tsc`.

- [ ] **Step 2: Scrivi il test della parte pura**

Create `supabase/functions/import-pdf/core.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { extractJson, isPdf, newId, normalizeScheda, ParseError, toBase64, toIntOrNull } from './core';

describe('extractJson', () => {
  it('accetta JSON puro', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it('toglie il recinto ```json', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('testo non JSON → ParseError', () => {
    expect(() => extractJson('ciao')).toThrow(ParseError);
  });
});

describe('toIntOrNull', () => {
  it.each([['20', 20], [12, 12], [0, null], ['-3', null], [null, null], ['abc', null]])('%s → %s', (v, out) => {
    expect(toIntOrNull(v)).toBe(out);
  });
});

describe('normalizeScheda (regole della vecchia route)', () => {
  const raw = {
    nome: '',
    mese: 'Ottobre',
    tipi: [
      {
        nome: 'Giorno A',
        esercizi: [{ titolo: ' Panca ', ripetizioni: '5sx10', carico: '30kg', recupero: '90"', note: '' }, { titolo: '' }],
        blocchi: [
          { tipo: 'circuito_amrap', durata_minuti: '20', giri_target: null, nota_comune: ' elastico ', esercizi: [{ titolo: 'Burpee', ripetizioni: '10' }] },
          { tipo: 'boh', durata_minuti: 0, esercizi: [{ titolo: 'Squat' }] },
          { tipo: 'circuito_giri', esercizi: [] },
        ],
      },
      { nome: '', esercizi: [{ titolo: 'Plank' }], blocchi: [] },
      { nome: 'Vuoto', esercizi: [{ titolo: '' }], blocchi: [] },
    ],
  };
  const s = normalizeScheda(raw, 'Scheda Marzo.PDF');

  it('nome dal file se manca; mese invariato', () => {
    expect(s.nome).toBe('Scheda Marzo');
    expect(s.mese).toBe('Ottobre');
  });
  it('scarta i giorni senza esercizi; «Allenamento» se manca il nome', () => {
    expect(s.tipi.map(t => t.nome)).toEqual(['Giorno A', 'Allenamento']);
  });
  it('tiene gli esercizi con titolo, con i campi trimmati', () => {
    expect(s.tipi[0].esercizi).toEqual([{ titolo: 'Panca', ripetizioni: '5sx10', carico: '30kg', recupero: '90"', note: '' }]);
  });
  it('blocchi: tipo ammesso o circuito_amrap, numeri positivi o null, blocchi vuoti scartati', () => {
    expect(s.tipi[0].blocchi).toEqual([
      { tipo: 'circuito_amrap', durataMinuti: 20, giriTarget: null, notaComune: 'elastico',
        esercizi: [{ titolo: 'Burpee', ripetizioni: '10', carico: '', recupero: '', note: '' }] },
      { tipo: 'circuito_amrap', durataMinuti: null, giriTarget: null, notaComune: '',
        esercizi: [{ titolo: 'Squat', ripetizioni: '', carico: '', recupero: '', note: '' }] },
    ]);
  });
  it('risposta non oggetto → ParseError', () => {
    expect(() => normalizeScheda(null, 'x.pdf')).toThrow(ParseError);
  });
});

describe('isPdf', () => {
  const enc = (s: string) => new TextEncoder().encode(s);
  it('riconosce la firma %PDF-', () => {
    expect(isPdf(enc('%PDF-1.7\n...'))).toBe(true);
  });
  it('accetta byte spuri prima della firma (entro 1024 byte)', () => {
    expect(isPdf(enc('\n\n  %PDF-1.4'))).toBe(true);
  });
  it('rifiuta ciò che non è PDF', () => {
    expect(isPdf(enc('PK\u0003\u0004 zip'))).toBe(false);
    expect(isPdf(new Uint8Array(0))).toBe(false);
  });
});

describe('toBase64', () => {
  it('coincide con Buffer per input piccoli e grandi', () => {
    const small = new Uint8Array([0, 1, 2, 250, 255]);
    expect(toBase64(small)).toBe(Buffer.from(small).toString('base64'));
    const big = new Uint8Array(100_001).map((_, i) => (i * 31) % 256);
    expect(toBase64(big)).toBe(Buffer.from(big).toString('base64'));
  });
});

describe('newId', () => {
  it('genera id testuali diversi', () => {
    expect(newId()).not.toBe(newId());
  });
});
```

- [ ] **Step 3: Esegui il test e verifica che fallisca**

Run: `npm test`
Expected: FAIL per `core.test.ts` (modulo mancante).

- [ ] **Step 4: Implementa `core.ts`**

Create `supabase/functions/import-pdf/core.ts`:

```ts
// Parte pura della Edge Function import-pdf (AP1 Fase 2). Nessun import: la usano
// sia Deno (index.ts) sia Vitest e tsc di Next. Regole identiche alla vecchia
// route app/api/import-pdf/route.ts.

export type BloccoTipo = 'circuito_amrap' | 'circuito_giri' | 'singolo';

export interface ParsedEsercizio {
  titolo: string;
  ripetizioni: string;
  carico: string;
  recupero: string;
  note: string;
}

export interface ParsedBlocco {
  tipo: BloccoTipo;
  durataMinuti: number | null;
  giriTarget: number | null;
  notaComune: string;
  esercizi: ParsedEsercizio[];
}

export interface ParsedTipo {
  nome: string;
  esercizi: ParsedEsercizio[];
  blocchi: ParsedBlocco[];
}

export interface ParsedScheda {
  nome: string;
  mese: string;
  tipi: ParsedTipo[];
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

/** Toglie l'eventuale recinto ```json e fa il parse. */
export function extractJson(rawText: string): unknown {
  const raw = rawText.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(raw);
  } catch {
    throw new ParseError('La risposta AI non è JSON valido');
  }
}

type Loose = Record<string, unknown> | null | undefined;

const ALLOWED_BLOCCO = new Set<string>(['circuito_amrap', 'circuito_giri', 'singolo']);
const asArray = (v: unknown): Loose[] => (Array.isArray(v) ? (v as Loose[]) : []);
const hasTitolo = (v: unknown) => asArray(v).some(e => Boolean(e?.titolo));
const str = (v: unknown) => String(v || '').trim();

export function toIntOrNull(v: unknown): number | null {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const toEsercizio = (e: Loose): ParsedEsercizio => ({
  titolo: str(e?.titolo),
  ripetizioni: str(e?.ripetizioni),
  carico: str(e?.carico),
  recupero: str(e?.recupero),
  note: str(e?.note),
});

/** Scarta i giorni senza esercizi, normalizza tipi di blocco, numeri e stringhe. */
export function normalizeScheda(parsed: unknown, fileName: string): ParsedScheda {
  if (!parsed || typeof parsed !== 'object') throw new ParseError('La risposta AI non è un oggetto');
  const p = parsed as Record<string, unknown>;
  const tipi = asArray(p.tipi)
    .filter(t => hasTitolo(t?.esercizi) || asArray(t?.blocchi).some(b => hasTitolo(b?.esercizi)))
    .map((t): ParsedTipo => ({
      nome: (t?.nome as string) || 'Allenamento',
      esercizi: asArray(t?.esercizi).filter(e => e?.titolo).map(toEsercizio),
      blocchi: asArray(t?.blocchi)
        .filter(b => hasTitolo(b?.esercizi))
        .map((b): ParsedBlocco => ({
          tipo: ALLOWED_BLOCCO.has(String(b?.tipo)) ? (b?.tipo as BloccoTipo) : 'circuito_amrap',
          durataMinuti: toIntOrNull(b?.durata_minuti),
          giriTarget: toIntOrNull(b?.giri_target),
          notaComune: str(b?.nota_comune),
          esercizi: asArray(b?.esercizi).filter(e => e?.titolo).map(toEsercizio),
        })),
    }));
  return {
    nome: (p.nome as string) || fileName.replace(/\.pdf$/i, ''),
    mese: (p.mese as string) || '',
    tipi,
  };
}

/** Firma %PDF- nei primi 1024 byte (controllo leggero, prima di spendere una chiamata AI). */
export function isPdf(bytes: Uint8Array): boolean {
  const head = bytes.subarray(0, 1024);
  for (let i = 0; i + 4 < head.length; i++) {
    if (head[i] === 0x25 && head[i + 1] === 0x50 && head[i + 2] === 0x44 && head[i + 3] === 0x46 && head[i + 4] === 0x2d) {
      return true;
    }
  }
  return false;
}

/** Base64 senza dipendenze (btoa a blocchi da 32 KB). */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Stesso formato di lib/utils.ts newId(): time-sortable. */
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
```

- [ ] **Step 5: Esegui il test e verifica che passi**

Run: `npm test && npx tsc --noEmit`
Expected: PASS e nessun errore TypeScript.

- [ ] **Step 6: Prompt e configurazione (spike)**

Estrai il prompt dalla vecchia route, identico:

```bash
node -e '
const fs = require("fs");
const src = fs.readFileSync("app/api/import-pdf/route.ts", "utf8");
const start = src.indexOf("text: `") + "text: `".length;
const end = src.indexOf("`", start);
const prompt = src.slice(start, end);
if (!prompt.startsWith("Sei un assistente per palestra")) throw new Error("estrazione non riuscita");
fs.writeFileSync("supabase/functions/import-pdf/prompt.ts",
  "// Prompt di import, identico a app/api/import-pdf/route.ts (estratto il 2026-10-13).\n" +
  "export const IMPORT_PROMPT = `" + prompt + "`;\n");
'
```

Run: `grep -c "Sei un assistente per palestra\|Blocchi accessori → tipi separati" supabase/functions/import-pdf/prompt.ts`
Expected: `2`.

Create `supabase/functions/import-pdf/config.ts`:

```ts
// Costanti di import-pdf: unico punto da modificare.

/** Import consentiti per utente nella finestra. Con MNGMT1 potrà dipendere dal ruolo. */
export const IMPORT_PDF_DAILY_LIMIT = 10;
export const IMPORT_PDF_WINDOW_HOURS = 24;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
/** Modello attuale; la scelta definitiva arriva dopo lo spike. */
export const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
/** 4096 troncava le schede lunghe (fix 871efb3 del 2026-10-20): margine fino a 16000. */
export const ANTHROPIC_MAX_TOKENS = 16000;
/** Sotto i 150 s di idle timeout delle Edge Function. */
export const CLAUDE_TIMEOUT_MS = 120_000;
export const ALLOWED_ORIGINS = [
  'https://allenamenti-app.vercel.app',
  'http://localhost:3000',
  'capacitor://localhost',
  'https://localhost',
];
export const FN_NAME = 'import-pdf';

/** SOLO SPIKE (Task 12): modelli confrontabili. Si toglie nel Task 13. */
export const SPIKE_MODELS = ['claude-sonnet-4-6', 'claude-sonnet-5-5'];
```

- [ ] **Step 7: Funzione in versione spike**

Create `supabase/functions/import-pdf/index.ts`:

```ts
// SPIKE (AP1 Fase 2, Task 12): misura tempi e confronta i modelli. NON scrive schede.
// Ha già JWT e limite per utente. Nel Task 13 diventa la versione definitiva.
import { createClient } from 'npm:@supabase/supabase-js@2.99.2';
import {
  ANTHROPIC_MAX_TOKENS, ANTHROPIC_MODEL, CLAUDE_TIMEOUT_MS, FN_NAME,
  IMPORT_PDF_DAILY_LIMIT, IMPORT_PDF_WINDOW_HOURS, MAX_PDF_BYTES, SPIKE_MODELS,
} from './config.ts';
import { IMPORT_PROMPT } from './prompt.ts';
import { extractJson, isPdf, normalizeScheda, toBase64 } from './core.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  const t0 = performance.now();
  if (req.method !== 'POST') return json(405, { error: 'METHOD' });

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
  const user = userData?.user;
  if (!user) return json(401, { error: 'AUTH' });

  const since = new Date(Date.now() - IMPORT_PDF_WINDOW_HOURS * 3_600_000).toISOString();
  const { count } = await supabase.from('ai_usage').select('id', { count: 'exact', head: true })
    .eq('fn', FN_NAME).gte('created_at', since);
  if ((count ?? 0) >= IMPORT_PDF_DAILY_LIMIT) return json(429, { error: 'LIMIT', count });

  const form = await req.formData();
  const file = form.get('pdf');
  if (!(file instanceof File)) return json(400, { error: 'NO_FILE' });
  if (file.size > MAX_PDF_BYTES) return json(413, { error: 'TOO_LARGE', size: file.size });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) {
    return json(400, { error: 'NOT_PDF', size: file.size, readMs: Math.round(performance.now() - t0) });
  }

  const requested = String(form.get('model') ?? '');
  const model = SPIKE_MODELS.includes(requested) ? requested : ANTHROPIC_MODEL;
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY_EDGE');
  if (!apiKey) return json(500, { error: 'AI_CONFIG' });
  await supabase.from('ai_usage').insert({ user_id: user.id, fn: FN_NAME });

  const t1 = performance.now();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: toBase64(bytes) } },
          { type: 'text', text: IMPORT_PROMPT },
        ],
      }],
    }),
    signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS),
  });
  const claudeMs = Math.round(performance.now() - t1);
  if (!res.ok) return json(502, { error: 'AI_UNAVAILABLE', status: res.status, claudeMs });
  const msg = await res.json();
  const first = msg?.content?.[0];
  const text = first?.type === 'text' ? String(first.text) : '';
  let scheda = null;
  let parseOk = true;
  try {
    scheda = normalizeScheda(extractJson(text), file.name);
  } catch {
    parseOk = false;
  }
  return json(200, {
    model, parseOk, claudeMs, totalMs: Math.round(performance.now() - t0),
    usage: msg?.usage ?? null, stopReason: msg?.stop_reason ?? null, size: file.size, scheda,
  });
});
```

- [ ] **Step 8: Deploy della versione spike**

Carica lo schema del tool con `ToolSearch` (`select:mcp__claude_ai_Supabase__deploy_edge_function`). Poi esegui `deploy_edge_function`:
- `project_id: "lzwyhokkvzxlnubsenmf"`, `name: "import-pdf"`, entrypoint `index.ts`, `verify_jwt: true`;
- i 4 file `index.ts`, `config.ts`, `prompt.ts` e `core.ts`, con il loro contenuto.

Expected: deploy riuscito. Nessun client la chiama ancora.

- [ ] **Step 9: Script di misura**

Create `scripts/spike-import-pdf.mjs`:

```js
// Spike AP1 (Task 12): chiama import-pdf (versione spike) con l'utente di test 1
// e stampa tempi, token e conteggi; salva l'albero normalizzato in OUT_DIR.
// Uso: OUT_DIR=<cartella> node --env-file=.env.local scripts/spike-import-pdf.mjs <modello> <file> [altri file]
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const [model, ...files] = process.argv.slice(2);
if (!model || files.length === 0) {
  console.error('uso: <modello> <file> [altri file]');
  process.exit(2);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await db.auth.signInWithPassword({
  email: process.env.TEST_USER_EMAIL,
  password: process.env.TEST_USER_PASSWORD,
});
if (error) {
  console.error('login non riuscito:', error.message);
  process.exit(1);
}
const token = data.session.access_token;

for (const path of files) {
  const buf = await readFile(path);
  const form = new FormData();
  form.append('pdf', new Blob([buf], { type: 'application/pdf' }), basename(path));
  form.append('model', model);
  const t0 = performance.now();
  const res = await fetch(`${url}/functions/v1/import-pdf`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: anon },
    body: form,
  });
  const wallMs = Math.round(performance.now() - t0);
  const body = await res.json().catch(() => ({}));
  const s = body.scheda;
  const counts = s
    ? {
        giorni: s.tipi.length,
        blocchi: s.tipi.reduce((n, t) => n + t.blocchi.length, 0),
        esercizi: s.tipi.reduce((n, t) => n + t.esercizi.length + t.blocchi.reduce((m, b) => m + b.esercizi.length, 0), 0),
      }
    : null;
  console.log(JSON.stringify({
    file: basename(path), bytes: buf.length, status: res.status, wallMs, model: body.model,
    claudeMs: body.claudeMs, totalMs: body.totalMs, usage: body.usage, stopReason: body.stopReason,
    parseOk: body.parseOk, counts, error: body.error,
  }));
  if (process.env.OUT_DIR && s) {
    await writeFile(join(process.env.OUT_DIR, `${basename(path)}.${body.model}.json`), JSON.stringify(s, null, 2));
  }
}
```

- [ ] **Step 10: Misure**

`OUT_DIR` è la cartella scratchpad della sessione. I PDF sono quelli indicati da Fabrizio.

**Riferimento:** tra i PDF va incluso `test sk.pdf` (85 KB, scheda lunga da 7 giorni). Sulla route Next, dopo la correzione del 2026-10-20 (`871efb3`), ha dato `end_turn` con 3122 token in uscita (JSON compatto), 10.517 in ingresso e 45 s di Claude. Con 4096 token e JSON indentato veniva troncato. Ogni misura deve avere `stopReason` = `end_turn`.

1. **Avvio a freddo e a caldo, modello attuale:**
   `OUT_DIR=<scratchpad> node --env-file=.env.local scripts/spike-import-pdf.mjs claude-sonnet-4-6 <pdf1> <pdf1> <pdf2>`
   La prima chiamata dopo il deploy misura l'avvio a freddo.
2. **Sonnet più recente:**
   `OUT_DIR=<scratchpad> node --env-file=.env.local scripts/spike-import-pdf.mjs claude-sonnet-5-5 <pdf1> <pdf2>`
3. **Payload grande senza costo AI.** Il file non è un PDF, quindi la funzione risponde prima di chiamare Claude.
   ```bash
   head -c 9961472 /dev/urandom > <scratchpad>/quasi-10mb.bin
   head -c 11534336 /dev/urandom > <scratchpad>/oltre-10mb.bin
   node --env-file=.env.local scripts/spike-import-pdf.mjs claude-sonnet-4-6 <scratchpad>/quasi-10mb.bin <scratchpad>/oltre-10mb.bin
   ```
   Expected: `quasi-10mb.bin` → 400 `NOT_PDF`, cioè la piattaforma accetta il body da circa 9,5 MB. `oltre-10mb.bin` → 413 `TOO_LARGE`, oppure un rifiuto della piattaforma: annota quale dei due.
4. **CPU**: tool MCP `get_logs` (servizio `edge-function`), oppure il dashboard. Annota CPU e durata per le chiamate con Claude.

Le chiamate dei punti 1 e 2 sono 6 e consumano 6 delle 10 quote giornaliere dell'utente di test 1. I file del punto 3 non consumano quota.

- [ ] **Step 11: Nota dello spike e decisione**

Per il costo, prendi i prezzi dal listino ufficiale Anthropic del giorno (WebFetch della pagina prezzi; fonte e data vanno nella nota). Il costo è `input_tokens × prezzo_input + output_tokens × prezzo_output`.

Create `docs/superpowers/notes/ap1-spike-import-pdf.md`. Sostituisci i valori `⟨…⟩` con le misure:

````markdown
# AP1 Fase 2 — Spike import-pdf su Edge Function

> ⟨data⟩ · funzione `import-pdf` in versione spike · utente di test 1 · spec §9.1

## Limiti della piattaforma (documentazione Supabase)

- Durata massima: 150 s sul piano Free (400 s sui piani a pagamento).
- Idle timeout: 150 s. CPU: 2 s per richiesta. Memoria: 256 MB.

## Misure

| PDF | Dimensione | Modello | Freddo/caldo | Claude (ms) | Totale funzione (ms) | Totale client (ms) | Token in/out | stop_reason | Parse |
|---|---|---|---|---|---|---|---|---|---|
| ⟨…⟩ | | | | | | | | | |

- **Payload**:
  - 9,5 MB → ⟨esito⟩;
  - 11 MB → ⟨esito⟩.
- **CPU dai log**: ⟨valori⟩. Nessuna libreria PDF: il file va a Claude in base64.

## Confronto tra modelli (stesso PDF)

| | claude-sonnet-4-6 | claude-sonnet-5-5 |
|---|---|---|
| Tempo medio Claude | ⟨…⟩ | ⟨…⟩ |
| Costo per import (listino del ⟨data⟩, ⟨fonte⟩) | ⟨…⟩ | ⟨…⟩ |
| Giorni / blocchi / esercizi estratti | ⟨…⟩ | ⟨…⟩ |
| Separazione ripetizioni / carico / note | ⟨osservazioni⟩ | ⟨osservazioni⟩ |
| Errori evidenti | ⟨…⟩ | ⟨…⟩ |

Gli alberi estratti sono nella cartella locale della sessione e non vengono committati.

## Esito

- La Edge Function regge? ⟨sì/no, perché⟩ (se no: ripiego su una funzione Vercel, da decidere).
- Proposta di timeout: client ⟨ms⟩, Claude ⟨ms⟩.
- **Decisione di Fabrizio (modello):** ⟨…⟩, il ⟨data⟩.
````

Manda a Fabrizio le due tabelle e la proposta di timeout, e aspetta la sua decisione sul modello. Expected: il nome del modello scelto.

- [ ] **Step 12: Commit**

```bash
git add tsconfig.json supabase/functions/import-pdf scripts/spike-import-pdf.mjs docs/superpowers/notes/ap1-spike-import-pdf.md
git commit -F - <<'EOF'
spike(ap1): import-pdf su Edge Function — misure e confronto modelli

- parte pura (core.ts) testata: parse e normalizzazione come la vecchia
  route, firma PDF, base64
- prompt estratto identico dalla vecchia route
- versione spike della funzione (JWT, limite per utente, nessuna scrittura)
- misure, payload, CPU e confronto modelli nella nota; decisione di Fabrizio

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 13: Edge Function definitiva (subagent 2C)

**Esecuzione:** subagent, nel worktree `.claude/worktrees/2c-import-pdf` (branch `ap1/2c-import-pdf`, creato da `main` dopo il Task 12). Il deploy lo fa la sessione nel Task 15. Il subagent riceve dalla sessione il **modello scelto** e i **timeout** decisi nel Task 12.

**Files:**
- Modify: `supabase/functions/import-pdf/core.ts` (+ `buildImportRows`), `supabase/functions/import-pdf/core.test.ts`, `supabase/functions/import-pdf/config.ts`, `supabase/functions/import-pdf/index.ts` (riscritto)

**Interfaces:**
- Consumes: `core.ts`, `config.ts` e `prompt.ts` del Task 12; tabella `ai_usage` (Task 11).
- Produces:
  - in `core.ts`: `buildImportRows(s: ParsedScheda, userId: string, makeId: () => string): ImportRows`, con le interfacce `ImportRows`, `ImportResult` e `ImportResultEsercizio`;
  - la risposta 201 della funzione, che ha la forma di `ImportPdfResult` (`lib/data/types.ts`);
  - errori con body `{ error: <codice>, message: <testo per l'utente> }` e i codici HTTP del §9.2 della spec.

- [ ] **Step 1: Scrivi il test di `buildImportRows`**

Aggiungi a `supabase/functions/import-pdf/core.test.ts`:
- `buildImportRows` all'import da `./core`;
- in fondo al file:

```ts
describe('buildImportRows', () => {
  const e = (titolo: string) => ({ titolo, ripetizioni: '', carico: '', recupero: '', note: '' });

  it('righe per scheda, giorni, blocchi ed esercizi, con ordine e user_id', () => {
    let n = 0;
    const makeId = () => `id${++n}`;
    const rows = buildImportRows({
      nome: 'S', mese: 'M',
      tipi: [{
        nome: 'A',
        esercizi: [e('Panca')],
        blocchi: [{ tipo: 'circuito_amrap', durataMinuti: 12, giriTarget: null, notaComune: '', esercizi: [e('Burpee'), e('Squat')] }],
      }],
    }, 'u1', makeId);

    expect(rows.scheda).toEqual({ id: 'id1', nome: 'S', mese: 'M', user_id: 'u1' });
    expect(rows.tipi).toEqual([{ id: 'id2', scheda_id: 'id1', nome: 'A', ordine: 0, user_id: 'u1' }]);
    expect(rows.blocchi).toEqual([{
      id: 'id4', tipo_id: 'id2', ordine: 0, tipo: 'circuito_amrap', durata_minuti: 12, giri_target: null, nota_comune: null, user_id: 'u1',
    }]);
    expect(rows.esercizi.map(r => [r.titolo, r.blocco_id, r.ordine, r.tipo_id, r.user_id])).toEqual([
      ['Panca', null, 0, 'id2', 'u1'],
      ['Burpee', 'id4', 0, 'id2', 'u1'],
      ['Squat', 'id4', 1, 'id2', 'u1'],
    ]);
    expect(rows.result).toEqual({
      id: 'id1', nome: 'S', mese: 'M',
      tipi: [{
        id: 'id2', nome: 'A',
        esercizi: [{ id: 'id3', ...e('Panca') }],
        blocchi: [{
          id: 'id4', tipo: 'circuito_amrap', durataMinuti: 12, giriTarget: null, notaComune: '',
          esercizi: [{ id: 'id5', ...e('Burpee') }, { id: 'id6', ...e('Squat') }],
        }],
      }],
    });
  });

  it('nota_comune vuota → null nel DB', () => {
    const rows = buildImportRows({
      nome: 'S', mese: '',
      tipi: [{ nome: 'A', esercizi: [], blocchi: [{ tipo: 'circuito_giri', durataMinuti: null, giriTarget: 3, notaComune: 'x', esercizi: [e('Plank')] }] }],
    }, 'u', () => Math.random().toString(36));
    expect(rows.blocchi[0].nota_comune).toBe('x');
    expect(rows.blocchi[0].giri_target).toBe(3);
  });
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npm test`
Expected: FAIL: `buildImportRows` non esiste.

- [ ] **Step 3: Implementa `buildImportRows`**

Aggiungi in fondo a `supabase/functions/import-pdf/core.ts`:

```ts
export interface ImportResultEsercizio {
  id: string;
  titolo: string;
  ripetizioni: string;
  carico: string;
  recupero: string;
  note: string;
}

/** Risposta 201: stessa forma di ImportPdfResult (lib/data/types.ts). */
export interface ImportResult {
  id: string;
  nome: string;
  mese: string;
  tipi: Array<{
    id: string;
    nome: string;
    esercizi: ImportResultEsercizio[];
    blocchi: Array<{
      id: string;
      tipo: BloccoTipo;
      durataMinuti: number | null;
      giriTarget: number | null;
      notaComune: string;
      esercizi: ImportResultEsercizio[];
    }>;
  }>;
}

export interface ImportRows {
  scheda: { id: string; nome: string; mese: string; user_id: string };
  tipi: Array<{ id: string; scheda_id: string; nome: string; ordine: number; user_id: string }>;
  blocchi: Array<{
    id: string; tipo_id: string; ordine: number; tipo: BloccoTipo;
    durata_minuti: number | null; giri_target: number | null; nota_comune: string | null; user_id: string;
  }>;
  esercizi: Array<{
    id: string; tipo_id: string; blocco_id: string | null; titolo: string; ripetizioni: string;
    carico: string; recupero: string; note: string; ordine: number; user_id: string;
  }>;
  result: ImportResult;
}

/**
 * Albero normalizzato → righe DB, nell'ordine di inserimento (scheda, giorni, blocchi, esercizi).
 * `ordine`: indice nel giorno per i singoli, indice nel blocco per gli esercizi dei circuiti
 * (come la vecchia route). Gli id li genera `makeId`.
 */
export function buildImportRows(s: ParsedScheda, userId: string, makeId: () => string): ImportRows {
  const scheda = { id: makeId(), nome: s.nome, mese: s.mese, user_id: userId };
  const rows: ImportRows = {
    scheda, tipi: [], blocchi: [], esercizi: [],
    result: { id: scheda.id, nome: s.nome, mese: s.mese, tipi: [] },
  };
  s.tipi.forEach((t, ti) => {
    const tipoId = makeId();
    rows.tipi.push({ id: tipoId, scheda_id: scheda.id, nome: t.nome, ordine: ti, user_id: userId });
    const toRow = (e: ParsedEsercizio, ei: number, bloccoId: string | null): ImportResultEsercizio => {
      const id = makeId();
      rows.esercizi.push({ id, tipo_id: tipoId, blocco_id: bloccoId, ...e, ordine: ei, user_id: userId });
      return { id, ...e };
    };
    const esercizi = t.esercizi.map((e, ei) => toRow(e, ei, null));
    const blocchi = t.blocchi.map((b, bi) => {
      const bloccoId = makeId();
      rows.blocchi.push({
        id: bloccoId, tipo_id: tipoId, ordine: bi, tipo: b.tipo,
        durata_minuti: b.durataMinuti, giri_target: b.giriTarget, nota_comune: b.notaComune || null, user_id: userId,
      });
      return {
        id: bloccoId, tipo: b.tipo, durataMinuti: b.durataMinuti, giriTarget: b.giriTarget, notaComune: b.notaComune,
        esercizi: b.esercizi.map((e, ei) => toRow(e, ei, bloccoId)),
      };
    });
    rows.result.tipi.push({ id: tipoId, nome: t.nome, esercizi, blocchi });
  });
  return rows;
}
```

- [ ] **Step 4: Esegui e verifica che passi**

Run: `npm test && npx tsc --noEmit`
Expected: PASS e nessun errore TypeScript.

- [ ] **Step 5: `config.ts` definitivo**

Togli la costante `SPIKE_MODELS` con il suo commento. Imposta `ANTHROPIC_MODEL` sul modello scelto da Fabrizio (se ha tenuto quello attuale, resta `'claude-sonnet-4-6'`) e `CLAUDE_TIMEOUT_MS` sul valore deciso nella nota dello spike, che deve restare sotto 150000. Aggiorna il commento del modello:

```ts
/** Modello deciso da Fabrizio dopo lo spike (docs/superpowers/notes/ap1-spike-import-pdf.md). */
```

- [ ] **Step 6: `index.ts` definitivo**

Sostituisci il contenuto di `supabase/functions/import-pdf/index.ts` con:

```ts
// Edge Function import-pdf (AP1 Fase 2): PDF → Claude → scheda nel database dell'utente.
// La chiave Anthropic sta solo qui (secret ANTHROPIC_API_KEY_EDGE). Le scritture usano il JWT
// dell'utente, quindi passano dalla RLS. Costanti in config.ts, logica pura in core.ts.
import { createClient } from 'npm:@supabase/supabase-js@2.99.2';
import {
  ALLOWED_ORIGINS, ANTHROPIC_MAX_TOKENS, ANTHROPIC_MODEL, CLAUDE_TIMEOUT_MS, FN_NAME,
  IMPORT_PDF_DAILY_LIMIT, IMPORT_PDF_WINDOW_HOURS, MAX_PDF_BYTES,
} from './config.ts';
import { IMPORT_PROMPT } from './prompt.ts';
import { buildImportRows, extractJson, isPdf, newId, normalizeScheda, toBase64, type ImportRows } from './core.ts';

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { Vary: 'Origin' };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info';
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  }
  return headers;
}

function reply(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

function fail(status: number, code: string, message: string, origin: string | null): Response {
  return reply(status, { error: code, message }, origin);
}

const AI_CONFIG_MSG = 'Import non disponibile: servizio AI non configurato.';
const AI_DOWN_MSG = 'Servizio AI non disponibile, riprova tra poco.';
const DB_MSG = 'Errore durante il salvataggio della scheda importata.';

Deno.serve(async (req: Request) => {
  // CORS: solo le origini dell'app. Senza Origin (non browser) si passa al controllo JWT.
  const origin = req.headers.get('Origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return fail(403, 'ORIGIN', 'Origine non ammessa.', null);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return fail(405, 'METHOD', 'Metodo non ammesso.', origin);

  // 1. Utente: la piattaforma ha già verificato il JWT (verify_jwt attivo).
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
  const user = userData?.user;
  if (!user) return fail(401, 'AUTH', 'Sessione scaduta: accedi di nuovo.', origin);

  // 2. Limite per utente (righe ai_usage dell'utente, sotto RLS).
  const since = new Date(Date.now() - IMPORT_PDF_WINDOW_HOURS * 3_600_000).toISOString();
  const { count, error: countErr } = await supabase
    .from('ai_usage').select('id', { count: 'exact', head: true })
    .eq('fn', FN_NAME).gte('created_at', since);
  if (countErr) return fail(500, 'DB', 'Errore nel controllo del limite.', origin);
  if ((count ?? 0) >= IMPORT_PDF_DAILY_LIMIT) {
    return fail(429, 'LIMIT', `Hai raggiunto il limite di ${IMPORT_PDF_DAILY_LIMIT} import in ${IMPORT_PDF_WINDOW_HOURS} ore.`, origin);
  }

  // 3. File.
  let file: File | null = null;
  try {
    const entry = (await req.formData()).get('pdf');
    file = entry instanceof File ? entry : null;
  } catch {
    file = null;
  }
  if (!file) return fail(400, 'NO_FILE', 'Nessun file caricato.', origin);
  if (file.size > MAX_PDF_BYTES) {
    return fail(413, 'TOO_LARGE', `Il PDF supera i ${MAX_PDF_BYTES / (1024 * 1024)} MB.`, origin);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) return fail(400, 'NOT_PDF', 'Il file non è un PDF.', origin);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY_EDGE');
  if (!apiKey) return fail(500, 'AI_CONFIG', AI_CONFIG_MSG, origin);

  // 4. Il tentativo si conta prima di spendere la chiamata AI.
  const { error: usageErr } = await supabase.from('ai_usage').insert({ user_id: user.id, fn: FN_NAME });
  if (usageErr) return fail(500, 'DB', 'Errore nel controllo del limite.', origin);

  // 5. Claude.
  let text = '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: toBase64(bytes) } },
            { type: 'text', text: IMPORT_PROMPT },
          ],
        }],
      }),
      signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) {
      console.error('[import-pdf] chiave Anthropic rifiutata:', res.status);
      return fail(500, 'AI_CONFIG', AI_CONFIG_MSG, origin);
    }
    if (!res.ok) {
      console.error('[import-pdf] Claude HTTP', res.status);
      return fail(502, 'AI_UNAVAILABLE', AI_DOWN_MSG, origin);
    }
    const msg = await res.json();
    const first = msg?.content?.[0];
    text = first?.type === 'text' ? String(first.text) : '';
    console.log(JSON.stringify({
      evt: 'claude', model: ANTHROPIC_MODEL,
      input_tokens: msg?.usage?.input_tokens, output_tokens: msg?.usage?.output_tokens, stop_reason: msg?.stop_reason,
    }));
  } catch (e) {
    console.error('[import-pdf] Claude non raggiungibile:', String(e));
    return fail(502, 'AI_UNAVAILABLE', AI_DOWN_MSG, origin);
  }

  // 6. Parse e normalizzazione (regole della vecchia route).
  let rows: ImportRows;
  try {
    rows = buildImportRows(normalizeScheda(extractJson(text), file.name), user.id, newId);
  } catch {
    console.error('[import-pdf] risposta AI non parsabile:', text.slice(0, 300));
    return fail(422, 'AI_INVALID', "L'AI non ha restituito un JSON valido. Riprova o verifica il PDF.", origin);
  }

  // 7. Scritture (RLS). Se una fallisce si cancella la scheda parziale: le cascade puliscono il resto.
  const { error: schedaErr } = await supabase.from('schede').insert(rows.scheda);
  if (schedaErr) {
    console.error('[import-pdf] insert schede:', schedaErr.message);
    return fail(500, 'DB', DB_MSG, origin);
  }
  const steps: Array<[string, unknown[]]> = [['tipi', rows.tipi], ['blocchi', rows.blocchi], ['esercizi', rows.esercizi]];
  for (const [table, list] of steps) {
    if (list.length === 0) continue;
    const { error } = await supabase.from(table).insert(list);
    if (error) {
      console.error(`[import-pdf] insert ${table}:`, error.message);
      await supabase.from('schede').delete().eq('id', rows.scheda.id);
      return fail(500, 'DB', DB_MSG, origin);
    }
  }

  console.log(`[import-pdf] scheda importata: ${rows.result.tipi.length} giorni`);
  return reply(201, rows.result, origin);
});
```

- [ ] **Step 7: Verifica**

Run: `npm test && npx tsc --noEmit`
Expected: PASS. `index.ts` è escluso da `tsc`: lo controlla la sessione al deploy, nel Task 15.

- [ ] **Step 8: Commit (nel worktree)**

```bash
git add supabase/functions/import-pdf
git commit -F - <<'EOF'
feat(import-pdf): Edge Function definitiva

- buildImportRows (puro, testato): albero → righe con ordine e user_id,
  stessa logica della vecchia route
- index.ts: CORS sulle origini dell'app, JWT, limite per utente
  (ai_usage), controllo dimensione e firma PDF, Claude via fetch,
  scritture con il JWT dell'utente e pulizia della scheda parziale
- errori { error, message } con 400/401/403/413/422/429/500/502
- config: modello e timeout decisi dopo lo spike; via SPIKE_MODELS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 14: Client `importPdf` (subagent 2C)

**Esecuzione:** subagent, stesso worktree del Task 13.

**Files:**
- Create: `lib/data/importPdf.ts`, `lib/data/importPdf.test.ts`
- Modify: `lib/data/index.ts`

**Interfaces:**
- Consumes: `Db`; `DataError`, `DataErrorKind` e `toDataError`; `ImportPdfOptions` e `ImportPdfResult` (Task 3).
- Produces: `importPdf(db: Db, file: File, opts?: ImportPdfOptions): Promise<ImportPdfResult>`; `IMPORT_PDF_CLIENT_TIMEOUT_MS`; `dataApi.importPdf(file, opts?)`.

- [ ] **Step 1: Scrivi il test con fetch finto**

Create `lib/data/importPdf.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { DataError } from './errors';
import { importPdf } from './importPdf';
import type { Db } from './session';

const withSession = { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } }, error: null }) } } as unknown as Db;
const noSession = { auth: { getSession: async () => ({ data: { session: null }, error: null }) } } as unknown as Db;
const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], 'scheda.pdf', { type: 'application/pdf' });
const base = { baseUrl: 'https://x.supabase.co', anonKey: 'anon' };
const respond = (status: number, body: unknown) =>
  vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));

describe('importPdf', () => {
  it('201 → risultato; nella richiesta JWT, apikey e FormData', async () => {
    const result = { id: 's1', nome: 'S', mese: '', tipi: [] };
    const fetchImpl = respond(201, result);
    await expect(importPdf(withSession, file, { ...base, fetchImpl: fetchImpl as unknown as typeof fetch })).resolves.toEqual(result);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://x.supabase.co/functions/v1/import-pdf');
    const headers = init!.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok');
    expect(headers.apikey).toBe('anon');
    expect(init!.body).toBeInstanceOf(FormData);
  });

  it.each([
    [429, 'limit'], [401, 'auth'], [403, 'forbidden'], [400, 'invalid'],
    [413, 'invalid'], [422, 'invalid'], [502, 'server'], [500, 'server'],
  ])('HTTP %i → DataError %s col messaggio del server', async (status, kind) => {
    const fetchImpl = respond(status, { error: 'X', message: 'messaggio' });
    const err = await importPdf(withSession, file, { ...base, fetchImpl: fetchImpl as unknown as typeof fetch }).catch(e => e);
    expect(err).toBeInstanceOf(DataError);
    expect(err.kind).toBe(kind);
    expect(err.message).toBe('messaggio');
    expect(err.code).toBe('X');
  });

  it('rete assente → network', async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    const err = await importPdf(withSession, file, { ...base, fetchImpl: fetchImpl as unknown as typeof fetch }).catch(e => e);
    expect(err.kind).toBe('network');
  });

  it('timeout → network', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason));
    }));
    const err = await importPdf(withSession, file, {
      ...base, fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 10,
    }).catch(e => e);
    expect(err.kind).toBe('network');
  });

  it('senza sessione → auth, senza chiamare la rete', async () => {
    const fetchImpl = respond(201, {});
    const err = await importPdf(noSession, file, { ...base, fetchImpl: fetchImpl as unknown as typeof fetch }).catch(e => e);
    expect(err.kind).toBe('auth');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npm test`
Expected: FAIL (modulo mancante).

- [ ] **Step 3: Implementa `importPdf.ts` e collegalo**

Create `lib/data/importPdf.ts`. `IMPORT_PDF_CLIENT_TIMEOUT_MS` deve superare il limite della Edge Function (150 s di idle timeout), altrimenti la scheda può essere salvata mentre l'utente vede un errore e un nuovo tentativo crea un duplicato. È lo stesso caso corretto nella route Next il 2026-10-20 (`871efb3`). Se nel Task 12 si è deciso un valore diverso da 160 s, usa quello:

```ts
// Client della Edge Function import-pdf (AP1 Fase 2). La chiave Anthropic resta sul server.
import { DataError, toDataError, type DataErrorKind } from './errors';
import type { Db } from './session';
import type { ImportPdfOptions, ImportPdfResult } from './types';

/** Timeout lato client, deciso dallo spike (docs/superpowers/notes/ap1-spike-import-pdf.md). */
export const IMPORT_PDF_CLIENT_TIMEOUT_MS = 160_000;

const KIND_BY_STATUS: Record<number, DataErrorKind> = {
  400: 'invalid', 401: 'auth', 403: 'forbidden', 413: 'invalid', 422: 'invalid', 429: 'limit',
};

export async function importPdf(db: Db, file: File, opts: ImportPdfOptions = {}): Promise<ImportPdfResult> {
  const { data } = await db.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new DataError('auth', 'Sessione assente: accedi di nuovo.');

  const baseUrl = opts.baseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = opts.anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const doFetch = opts.fetchImpl ?? fetch;

  // Timeout + eventuale signal esterno, senza AbortSignal.any (iOS < 17.4).
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException('Timeout', 'TimeoutError')),
    opts.timeoutMs ?? IMPORT_PDF_CLIENT_TIMEOUT_MS,
  );
  opts.signal?.addEventListener('abort', () => controller.abort(opts.signal!.reason), { once: true });

  const form = new FormData();
  form.append('pdf', file);
  let res: Response;
  try {
    res = await doFetch(`${baseUrl}/functions/v1/import-pdf`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    throw toDataError(err);
  } finally {
    clearTimeout(timer);
  }

  let body: { error?: string; message?: string } = {};
  try {
    body = await res.json();
  } catch {
    // corpo non JSON: resta il messaggio generico qui sotto
  }
  if (res.status === 201) return body as unknown as ImportPdfResult;
  throw new DataError(
    KIND_BY_STATUS[res.status] ?? 'server',
    body.message ?? `Errore del servizio di import (${res.status}).`,
    { code: body.error },
  );
}
```

In `lib/data/index.ts`:
- aggiungi `import { importPdf } from './importPdf';` e `import type { ImportPdfOptions } from './types';`;
- nell'oggetto di `createDataApi` aggiungi:

```ts
    importPdf: (file: File, opts?: ImportPdfOptions) => importPdf(db, file, opts),
```

- [ ] **Step 4: Esegui e verifica che passi**

Run: `npm test && npx tsc --noEmit`
Expected: PASS: i 12 test di `importPdf` e tutti gli altri.

- [ ] **Step 5: Commit (nel worktree)**

```bash
git add lib/data/importPdf.ts lib/data/importPdf.test.ts lib/data/index.ts
git commit -F - <<'EOF'
feat(data): client della Edge Function import-pdf

- POST multipart con il JWT della sessione e l'apikey; timeout deciso
  dallo spike, compatibile con iOS < 17.4
- errori della funzione → DataError (limit, auth, forbidden, invalid,
  network, server) con il messaggio per l'utente
- test con fetch finto

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 15: Deploy, test e aggancio dell'import, cancello P3 e push

**Esecuzione:** sessione.

**Files:**
- Merge: `ap1/2c-import-pdf` → `main`
- Modify: `tests/db/rls.test.ts`, `app/(app)/schede/archivio/page.tsx` (`importPdf` righe 52–100, `useApp()` riga 34)
- Create: `tests/db/importPdf.test.ts`

- [ ] **Step 1: Merge e deploy della versione definitiva**

Run: `git merge --no-ff ap1/2c-import-pdf -m "merge: 2C import-pdf su Edge Function"`

Poi `deploy_edge_function`, come nel Task 12 Step 8: stessi 4 file nella versione definitiva, `verify_jwt: true`.
Expected: deploy riuscito.

- [ ] **Step 2: Test della Edge Function**

Aggiungi in fondo a `tests/db/rls.test.ts`:

```ts
describe('Edge Function import-pdf', () => {
  const fnUrl = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/import-pdf`;
  const anon = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  it('senza JWT → 401', async () => {
    const res = await fetch(fnUrl(), { method: 'POST', headers: { apikey: anon() } });
    expect(res.status).toBe(401);
  });

  it('origine non ammessa → 403', async () => {
    const res = await fetch(fnUrl(), {
      method: 'POST',
      headers: { apikey: anon(), authorization: `Bearer ${u1.token}`, origin: 'https://evil.example' },
    });
    expect(res.status).toBe(403);
  });

  // Riempie il contatore dell'utente 2 per 24 ore (le righe non si cancellano dal client):
  // gira solo con RLS_TEST_QUOTA=1.
  it.runIf(process.env.RLS_TEST_QUOTA === '1')('oltre il limite → 429, senza chiamare Claude', async () => {
    const rows = Array.from({ length: 10 }, () => ({ fn: 'import-pdf' }));
    const ins = await u2.db.from('ai_usage').insert(rows);
    expect(ins.error).toBeNull();
    const form = new FormData();
    form.append('pdf', new Blob([new TextEncoder().encode('%PDF-1.4 test')], { type: 'application/pdf' }), 'limite.pdf');
    const res = await fetch(fnUrl(), { method: 'POST', headers: { apikey: anon(), authorization: `Bearer ${u2.token}` }, body: form });
    expect(res.status).toBe(429);
  });
});
```

Create `tests/db/importPdf.test.ts`:

```ts
// Test funzionale dell'import (costa una chiamata a Claude): gira solo con
// DB_TEST_IMPORT_PDF=<percorso di un PDF piccolo>.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDataApi } from '@/lib/data';
import type { Db } from '@/lib/data/session';
import { signIn, type TestUser } from './helpers';

const pdfPath = process.env.DB_TEST_IMPORT_PDF;
let u1: TestUser;
let createdId: string | null = null;

beforeAll(async () => {
  if (pdfPath) u1 = await signIn(1);
});

afterAll(async () => {
  if (!createdId) return;
  // Pulizia verificata: solo se la scheda importata è dell'utente di test 1.
  const { data } = await u1.db.from('schede').select('id, user_id').eq('id', createdId).single();
  if (data?.user_id !== u1.id) throw new Error('pulizia interrotta: la scheda importata non è dell’utente di test');
  await u1.db.from('schede').delete().eq('id', createdId);
});

describe.runIf(Boolean(pdfPath))('import-pdf end-to-end', () => {
  it('importa il PDF e scrive l’albero della scheda', async () => {
    const api = createDataApi(u1.db as unknown as Db);
    const file = new File([readFileSync(pdfPath!)], basename(pdfPath!), { type: 'application/pdf' });
    const result = await api.importPdf(file);
    createdId = result.id;
    expect(result.tipi.length).toBeGreaterThan(0);
    const { data } = await u1.db.from('schede').select('id, user_id, tipi(id, esercizi(id), blocchi(id))').eq('id', result.id).single();
    expect(data?.user_id).toBe(u1.id);
    expect((data?.tipi ?? []).length).toBe(result.tipi.length);
  });
});
```

Run: `npm run test:db`
Expected: PASS. Il test end-to-end è saltato perché la variabile non è impostata.

Run, una volta, con il PDF più piccolo di Fabrizio: `DB_TEST_IMPORT_PDF=<pdf> npm run test:db -- tests/db/importPdf.test.ts`
Expected: PASS. Consuma 1 quota dell'utente di test 1.

- [ ] **Step 3: Aggancia l'archivio alla Edge Function**

In `app/(app)/schede/archivio/page.tsx`:
- la riga di `useApp()` diventa `const { schede, loadSchede, toast, activeScheda, setActiveSchedaId } = useApp();`;
- la funzione `importPdf`, da `async function importPdf(file: File) {` alla sua `}` di chiusura (righe 52–100), diventa:

```ts
  async function importPdf(file: File) {
    setPdfLoading(true);
    const steps = ['Lettura del PDF…', 'Analisi con AI…', 'Strutturazione scheda…'];
    let si = 0;
    setPdfStatus(steps[0]);
    const timer = setInterval(() => {
      si = Math.min(si + 1, steps.length - 1);
      setPdfStatus(steps[si]);
    }, 2500);
    try {
      const result = await dataApi.importPdf(file);
      await loadSchede();
      const nTipi = result.tipi.length;
      const nEs = result.tipi.reduce(
        (s, t) => s + t.esercizi.length + t.blocchi.reduce((bs, b) => bs + b.esercizi.length, 0),
        0,
      );
      toast(`Scheda "${result.nome}" importata: ${nTipi} giorni, ${nEs} esercizi`, 'success');
    } catch (err) {
      console.error('[import-pdf] Client error:', err);
      toast(toDataError(err).message || 'Errore sconosciuto durante l\'importazione', 'error');
    } finally {
      clearInterval(timer);
      setPdfLoading(false);
    }
  }
```

I messaggi per l'utente (limite, PDF troppo grande, servizio non configurato) arrivano già pronti dalla funzione, nel campo `message`. Sparisce il riferimento ad `ANTHROPIC_API_KEY`/`.env.local`.

Run: `grep -rn "apiFetch\|ANTHROPIC_API_KEY" "app/(app)/schede/archivio/page.tsx"`
Expected: nessun output.

- [ ] **Step 4: Cancello automatico**

Run: `npx tsc --noEmit && npm run build && npm test && npm run test:db`
Expected: tutto verde.

- [ ] **Step 5: Commit**

```bash
git add tests/db/rls.test.ts tests/db/importPdf.test.ts "app/(app)/schede/archivio/page.tsx"
git commit -F - <<'EOF'
feat(import-pdf): l'archivio importa i PDF tramite la Edge Function

- import da dataApi.importPdf; i messaggi d'errore (limite, dimensione,
  servizio) arrivano dalla funzione
- test: 401 senza JWT, 403 da origine non ammessa, 429 oltre il limite
  (opt-in, RLS_TEST_QUOTA=1), import end-to-end (opt-in,
  DB_TEST_IMPORT_PDF)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 6: Prova manuale P3 (Fabrizio)**

Avvia il server con `npm start` in background e manda:

> **Prova manuale P3** (build locale, utente di test 1)
> 1. **Flusso Live completo**, come in P1.
> 2. **Archivio → importa un PDF reale.** Compaiono i messaggi di avanzamento e poi «Scheda "…" importata: N giorni, M esercizi». La scheda ha giorni, blocchi ed esercizi corretti, come prima.
> 3. **Errore:** prova a importare un file che non è un PDF. Deve comparire «Il file non è un PDF.»
> 4. Elimina la scheda importata.
>
> Rispondi «ok P3», oppure dimmi a che passo qualcosa non va.

Expected: «ok P3». Poi `lsof -ti tcp:3000 | xargs kill`.

- [ ] **Step 7: Push P3 e pulizia del worktree**

Run:
```bash
git push
git worktree remove .claude/worktrees/2c-import-pdf
git branch -d ap1/2c-import-pdf
```
Expected: push riuscito e sito in produzione `200` dopo il deploy.

---

## Passo 4 — Pulizia → push P4

### Task 16: Pulizia, cancello P4 e push

**Esecuzione:** sessione.

**Files:**
- Delete: `app/api/` (le 13 route rimaste), `lib/auth.ts`, `tests/db/parity/`
- Modify: `providers/AppProvider.tsx` (via `apiFetch`), `package.json` e `package-lock.json` (via `@anthropic-ai/sdk`), `DESIGN.md` (sezione API), `docs/superpowers/notes/rls-audit.md`, `docs/BACKLOG.md`

- [ ] **Step 1: Nessuno usa più le route**

Run: `grep -rn "apiFetch\|/api/" app components lib providers --include='*.ts' --include='*.tsx' | grep -v '^app/api/' | grep -v '^providers/AppProvider.tsx'`
Expected: nessun output. Le sole occorrenze ammesse sono in `providers/AppProvider.tsx`, che si toglie allo Step 3.

- [ ] **Step 2: Elimina route, autenticazione server e test di parità**

Run:
```bash
git rm -r -q app/api lib/auth.ts tests/db/parity
npm uninstall @anthropic-ai/sdk
```
Expected: `app/api`, `lib/auth.ts` e `tests/db/parity` non esistono più; `@anthropic-ai/sdk` non è più in `package.json`.

- [ ] **Step 3: Togli `apiFetch` da `AppProvider`**

In `providers/AppProvider.tsx`:
- nell'interfaccia `AppContextValue` togli la riga `apiFetch: (url: string, options?: RequestInit) => Promise<Response>;`;
- togli la costante `apiFetch` (il `useCallback` con `fetch(url, …)`);
- nel `value` del provider la riga `apiFetch, toast, toastState,` diventa `toast, toastState,`.

Run: `grep -rn "apiFetch" app components lib providers`
Expected: nessun output.

- [ ] **Step 4: Aggiorna `DESIGN.md`**

Sostituisci:
```
### API
- `apiFetch` (da `useApp()`) — wrapper fetch con auth header.
- `/api/motivation` — eliminata il 2026-10-13 (AP1): nessun chiamante; resta nella storia git.
```
con:
```
### Dati
- `dataApi` (da `@/lib/data`) — livello dati diretto su Supabase: `workouts`, `schede`, `weightLogs`, `importPdf`. La RLS fa da guardia; gli errori arrivano come `DataError` (`kind`). Le route `/api/*` sono state eliminate nel 2026-10 (AP1 Fase 2).
- `import-pdf` — Supabase Edge Function (`supabase/functions/import-pdf/`), con limite per utente (`IMPORT_PDF_DAILY_LIMIT`).
```

- [ ] **Step 5: Cancello automatico**

Run: `rm -rf .next/types .next/dev/types && npx tsc --noEmit && npm run build && npm test && npm run test:db`
Expected: tutto verde. Nell'output del build non compare nessuna route `ƒ /api/...`.

`.next/types` e `.next/dev/types` sono tipi generati da Next (ignorati da git) che puntano ancora alle route eliminate: senza toglierli, `tsc` fallisce con `TS2307`. È successo in P0 con le route morte.

- [ ] **Step 6: Audit finale e BACKLOG**

In `docs/superpowers/notes/rls-audit.md`, alla sezione «Casi di test», aggiungi l'esito finale di `npm run test:rls`: data e numero di test verdi, compresi quelli della RPC, di `ai_usage` e della Edge Function.

In `docs/BACKLOG.md`, sezione AP1:
- spunta `Audit RLS tabella per tabella …`, aggiungendo ` — fatto, docs/superpowers/notes/rls-audit.md`;
- spunta `Mini-spike fattibilità import-pdf su Edge Function …`, aggiungendo ` — fatto, docs/superpowers/notes/ap1-spike-import-pdf.md`;
- spunta `Utenti di test: …`;
- nella tabella «Stato app» la riga `AP1 igiene + Fase 2 | ⏳ in avvio (vedi sezione AP1)` diventa `AP1 igiene + Fase 2 | ✅ completate (<data>) — prossimo: Fase 1 (static export)`.

Le priorità non si toccano.

- [ ] **Step 7: Commit**

```bash
git add -A app/api lib/auth.ts tests/db/parity providers/AppProvider.tsx package.json package-lock.json DESIGN.md docs/superpowers/notes/rls-audit.md
git commit -F - <<'EOF'
chore(ap1): elimina le route API, apiFetch e la SDK Anthropic dal web

- app/api vuota: tutte le chiamate passano da lib/data o dalla Edge
  Function import-pdf
- via lib/auth.ts (requireAuth), apiFetch e i test di parità
- DESIGN.md e audit RLS aggiornati

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git add docs/BACKLOG.md
git commit -F - <<'EOF'
docs: BACKLOG — AP1 Fase 2 completata (audit RLS, spike import-pdf, utenti di test)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 8: Prova manuale P4 (Fabrizio)**

Avvia il server con `npm start` in background e manda:

> **Prova manuale P4: regressione finale** (build locale, utente di test 1)
> 1. Flusso Live completo, con il salvataggio senza rete come in P1.
> 2. Modifica ed eliminazione di un allenamento da Home.
> 3. Archivio: CRUD di scheda, giorno ed esercizio, riordino, duplica (come in P2).
> 4. Storico pesi: aggiungi ed elimina.
> 5. Import di un PDF reale.
> 6. Calendario (settimana, mese, anno) e Profilo si aprono senza errori.
> 7. Elimina i dati di prova.
>
> Rispondi «ok P4», oppure dimmi a che passo qualcosa non va.

Expected: «ok P4». Poi `lsof -ti tcp:3000 | xargs kill`.

- [ ] **Step 9: Push P4 e azioni di Fabrizio**

Run: `git push`
Expected: push riuscito; dopo il deploy, `https://allenamenti-app.vercel.app/login` → `200`.

Ricorda a Fabrizio:
- rimuovere la variabile `ANTHROPIC_API_KEY` da Vercel (Project → Settings → Environment Variables) e revocare la vecchia chiave sulla console Anthropic;
- il limite di spesa resta impostato sulla chiave nuova.

Con `app/api` vuota, la **Fase 1 (static export)** può partire: il suo piano si scrive a parte.
