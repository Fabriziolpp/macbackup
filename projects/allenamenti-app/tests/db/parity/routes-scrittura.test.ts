// Verifica temporanea (fino a P4, quando le route vengono eliminate): le route di scrittura
// ancora in uso funzionano con le policy RLS. Utente di test 1, solo dati marcati [rls-test].
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST as routeCreateScheda } from '@/app/api/schede/route';
import { POST as routeDuplica } from '@/app/api/schede/[id]/duplica/route';
import { POST as routeCreateTipo } from '@/app/api/schede/[id]/tipi/route';
import { PUT as routeUpdateTipo } from '@/app/api/schede/[id]/tipi/[tipoId]/route';
import { POST as routeCreateEs } from '@/app/api/schede/[id]/tipi/[tipoId]/esercizi/route';
import { PUT as routeUpdateEs } from '@/app/api/schede/[id]/tipi/[tipoId]/esercizi/[esId]/route';
import { PUT as routeReorder } from '@/app/api/schede/[id]/tipi/[tipoId]/reorder/route';
import { cleanupMarked, MARK, signIn, tid, type TestUser } from '../helpers';

let u1: TestUser;

const req = (method: string, body?: unknown) =>
  new Request('http://verifica.test/api', {
    method,
    headers: { authorization: `Bearer ${u1.token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const es = (titolo: string) => ({ titolo, ripetizioni: '3x10', carico: '', recupero: '60"', note: '' });

beforeAll(async () => {
  u1 = await signIn(1);
  await cleanupMarked([u1]);
});

afterAll(async () => {
  if (u1) await cleanupMarked([u1]);
});

describe('route di scrittura con le policy RLS', () => {
  it('crea, modifica, riordina e duplica una scheda con un blocco AMRAP', async () => {
    const sRes = await routeCreateScheda(req('POST', { nome: `${MARK} verifica route`, mese: '' }));
    expect(sRes.status).toBe(201);
    const s = await sRes.json();

    const tRes = await routeCreateTipo(req('POST', { nome: 'Giorno A' }), params({ id: s.id }));
    expect(tRes.status).toBe(201);
    const t = await tRes.json();
    expect((await routeUpdateTipo(req('PUT', { nome: 'Giorno A1' }), params({ id: s.id, tipoId: t.id }))).status).toBe(200);

    const ids: string[] = [];
    for (const titolo of ['Panca', 'Squat', 'Burpee']) {
      const r = await routeCreateEs(req('POST', es(titolo)), params({ id: s.id, tipoId: t.id }));
      expect(r.status).toBe(201);
      ids.push((await r.json()).id);
    }

    // Blocco AMRAP con un esercizio dentro, scritti come fanno import e duplica (utente 1, righe proprie).
    const bloccoId = tid();
    const bl = await u1.db.from('blocchi').insert({
      id: bloccoId, tipo_id: t.id, ordine: 0, tipo: 'circuito_amrap', durata_minuti: 10, user_id: u1.id,
    });
    expect(bl.error).toBeNull();
    const link = await u1.db.from('esercizi').update({ blocco_id: bloccoId }).eq('id', ids[2]).select('id');
    expect(link.error).toBeNull();
    expect(link.data).toHaveLength(1);

    const upd = await routeUpdateEs(req('PUT', { ...es('Panca'), carico: '80kg', setsTarget: 4 }), params({ id: s.id, tipoId: t.id, esId: ids[0] }));
    expect(upd.status).toBe(200);

    // Riordino (PUT /reorder): ordine inverso.
    const reordered = [ids[2], ids[1], ids[0]];
    const ro = await routeReorder(req('PUT', { ordine: reordered }), params({ id: s.id, tipoId: t.id }));
    expect(ro.status).toBe(200);
    const { data: rows } = await u1.db.from('esercizi').select('id, ordine').eq('tipo_id', t.id).order('ordine');
    expect((rows ?? []).map(r => r.id)).toEqual(reordered);

    // Duplica: la copia ha giorno, blocco ed esercizi.
    const dRes = await routeDuplica(req('POST', { nome: `${MARK} verifica route copia`, mese: '' }), params({ id: s.id }));
    expect(dRes.status).toBe(201);
    const copy = await dRes.json();
    const { data: tree } = await u1.db.from('schede')
      .select('id, user_id, tipi(id, nome, esercizi(id, blocco_id), blocchi(id))').eq('id', copy.id).single();
    expect(tree?.user_id).toBe(u1.id);
    expect(tree?.tipi).toHaveLength(1);
    expect(tree?.tipi[0].blocchi).toHaveLength(1);
    expect(tree?.tipi[0].esercizi).toHaveLength(3);
    const nelBlocco = tree!.tipi[0].esercizi.filter((e: { blocco_id: string | null }) => e.blocco_id !== null);
    expect(nelBlocco).toHaveLength(1);
    expect(nelBlocco[0].blocco_id).toBe(tree!.tipi[0].blocchi[0].id);
  });
});
