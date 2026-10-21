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
