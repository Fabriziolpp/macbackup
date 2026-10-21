# SPEC_RUOLI_INBOX.md

**Feature:** Modello a 3 ruoli (trainee / trainer / superadmin) + invio schede trainer→trainee + Inbox notifiche + ganci futuri
**Autore spec:** Claude (project design) · **Impl:** Claude Code (Warp CLI)
**Stato:** CONFERMATO — opzione B (gestione trainer) + gancio libreria esercizi globale. Pronto per implementazione.
**DB verificato su Supabase reale** (project ref `lzwyhokkvzxlnubsenmf`).

> ⚠️ **BACKLOG.md non va toccato** senza istruzione esplicita di Fabrizio.
> ⚠️ **SEC1 è ora attiva**: questa feature introduce letture cross-utente (trainer↔trainee, superadmin). Le RLS vanno scritte con cura.
> ⚠️ **Nessuna migration è stata applicata** durante la stesura. Tutto lo SQL qui sotto è *proposto*; verificare lo stato remoto dopo ciascuna (lezione q1_infra).
> ℹ️ *Il nome file resta `SPEC_SUPERUSER_INBOX.md` sul disco per continuità; il titolo riflette lo scope allargato ai 3 ruoli.*

---

## 1. Contesto e scopo

Passiamo dalla struttura piatta attuale a **tre ruoli**:

- **trainee** — utente base, esegue gli allenamenti.
- **trainer** — amministra i *propri* trainee: carica/parsa/assegna schede, e (futuro) tutto il resto del management.
- **superadmin** — amministra i trainer (per ora solo Fabrizio): promuove, sospende, riassegna, e poteri di piattaforma da estendere.

Feature costruite in v1:

1. **Trainer → invio scheda** (era il "superuser" della prima stesura, ora ri-scopato al ruolo trainer): carica un PDF, lo parsa (FIX6), controlla la preview, assegna a **un proprio trainee**.
2. **Inbox trainee**: voce nel menu profilo con badge (anche sull'icona profilo in tab bar); lista notifiche tipo *"martedì 7 luglio — Nuova scheda inviata da Vito"*; tap → **Accetta** → scheda in archivio.
3. **Console SuperAdmin (gestione trainer)**: promuovi trainee→trainer, sospendi un trainer, riassegna i suoi trainee a un altro. Azioni tracciate in un audit log.

Ganci **bakati nello schema ora** (costo minimo, evitano retrofit dolorosi) ma **senza UI in v1**:

- Enum ruolo a 3 valori + legame `trainer_id` + `audit_log`.
- **Libreria esercizi globale**: `exercises` di proprietà piattaforma (senza owner) leggibili da tutti, scrivibili solo dal superadmin. Solo RLS ora; UI dopo.

Coerente con **Strategia A**: rifinire per gli utenti reali prima della crescita. La console trainer è deliberatamente **sottile e isolata** (scaffolding), perché il lato trainer diventerà in futuro una superficie dedicata molto più ampia — ma il *modello dati* (ruoli, legame, RPC di invio, storico) è permanente e ci si porta dietro intatto.

---

## 2. Stato del DB (verificato)

Gerarchia dati reale:

```
schede (id TEXT, nome, mese, user_id UUID→auth.users, data_inizio, weeks)   policy: users_own_schede [ALL]
  └─ tipi (id TEXT, scheda_id TEXT→schede, nome, ordine, user_id)      ← livello "Giorno"
       ├─ blocchi (id TEXT, tipo_id TEXT→tipi, ordine,
       │            tipo CHECK[circuito_amrap|circuito_giri|singolo],
       │            durata_minuti, giri_target, nota_comune, user_id, created_at)
       └─ esercizi (id TEXT, tipo_id TEXT→tipi, blocco_id TEXT→blocchi NULL,
                    titolo, ripetizioni, carico, recupero, note, ordine,
                    user_id, sets_target, rest_seconds, exercise_id UUID→exercises)

exercises (id UUID, user_id UUID nullable)   policy: "user owns exercises" [ALL, auth.uid()=user_id]
```

- **`user_id` è denormalizzato su ogni tabella** di dominio; ID `TEXT` generati client-side (parità con coda offline Dexie). `exercises.id` è UUID.
- **Fonte di verità ownership albero scheda = `schede.user_id`** (tipi/esercizi ci risalgono via join; `blocchi` usa la propria colonna).
- **`exercises.user_id` è GIÀ nullable** → il gancio libreria globale è solo RLS, nessun ALTER.
- RLS attuali: una sola policy `ALL` per tabella con `auth.uid()=user_id` (o via join per tipi/esercizi). `with_check` null → per UPDATE vale la `USING` anche sulla riga nuova ⇒ **riassegnazione client-side impossibile**, serve percorso privilegiato (RPC).
- Ambiente: **1 utente**, **0 funzioni public**, **nessun trigger auth**, **nessuna `profiles`**.

---

## 3. Decisioni architetturali

- **A1 — Modello ruoli:** enum `ruolo ∈ {trainee, trainer, superadmin}` su nuova tabella `profiles`. Niente flag booleani. Permessi derivati via helper `is_trainer()` / `is_superadmin()`. *(`profiles` serve comunque a R1.)*
- **A2 — Legame trainer↔trainee:** `profiles.trainer_id` (il trainee punta al suo trainer). È il gancio che abilita lo scoping "ogni trainer vede solo i suoi" — **bakato ora**, non "quando espandi".
- **A3 — Scritture privilegiate via RPC Postgres `SECURITY DEFINER`** (non Edge Function): invio scheda + operazioni superadmin. Cascade atomica, check ruolo interno, nessun service role lato client, nessun deploy separato. *Le RPC `SECURITY DEFINER` bypassano le RLS*, quindi le scritture cross-utente non richiedono policy di insert dedicate → le teniamo assenti (deny-by-default) per massima sicurezza.
- **A4 — Accettazione senza privilegi:** la scheda nasce **già di proprietà del trainee** (`stato='inviata'`); il trainee possiede scheda + notifica → accetta con RLS normali. L'unica scrittura privilegiata è l'invio.
- **A5 — Staging stateless (v1):** parse → preview in memoria → all'invio la RPC crea l'albero di proprietà del trainee. Nessuna bozza persistita. *(Libreria template = estensione futura, §8.)*
- **A6 — Scoping invio (opzione B):** un trainer può inviare **solo ai propri trainee**; il superadmin a chiunque. Gate applicato nella RPC.
- **A7 — Gancio libreria esercizi globale:** `exercises` con `user_id IS NULL` = globale/piattaforma; lettura per tutti gli autenticati, scrittura globale solo superadmin. Solo RLS ora, UI dopo.
- **A8 — Retrofit-safe:** il "posto" del superadmin è nell'enum dal giorno uno e le policy admin includono `OR is_superadmin(...)` fin da subito ⇒ i poteri superadmin futuri (§8) sono puramente additivi, nessuna migrazione dati.
- **A9 — Fork ruoli superficiale:** l'app trainee NON diventa "role-aware" ovunque. Un solo gate ("sei trainer/superadmin? mostra la console"). Niente ramificazioni profonde nell'app trainee.

---

## 4. Migrazioni proposte

### 4.1 — `profiles` + ruoli + legame + helper + trigger

```sql
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  nome       text default '',
  ruolo      text not null default 'trainee'
             check (ruolo in ('trainee','trainer','superadmin')),
  trainer_id uuid references public.profiles(id) on delete set null,  -- il trainer del trainee
  attivo     boolean not null default true,                          -- soft-suspend
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- helper SECURITY DEFINER: niente ricorsione RLS
create or replace function public.is_superadmin(uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select ruolo = 'superadmin' from public.profiles where id = uid), false) $$;

create or replace function public.is_trainer(uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select ruolo = 'trainer' from public.profiles where id = uid), false) $$;

-- RLS profiles:
--  read: te stesso · i tuoi trainee (se trainer) · tutti (se superadmin)
create policy "profiles read" on public.profiles for select using (
  auth.uid() = id
  or trainer_id = auth.uid()
  or public.is_superadmin(auth.uid())
);
--  update: te stesso · qualunque profilo se superadmin (il guard blocca i campi sensibili)
create policy "profiles update" on public.profiles for update using (
  auth.uid() = id or public.is_superadmin(auth.uid())
) with check (
  auth.uid() = id or public.is_superadmin(auth.uid())
);

-- guard: solo il superadmin può cambiare ruolo / trainer_id / attivo.
-- Chiunque altro può modificare solo campi neutri (es. nome) sul proprio profilo.
create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin(auth.uid()) then
    new.ruolo      := old.ruolo;
    new.trainer_id := old.trainer_id;
    new.attivo     := old.attivo;
  end if;
  return new;
end $$;
create trigger profiles_guard_biu before update on public.profiles
  for each row execute function public.profiles_guard();

-- popolamento automatico su signup (default: trainee)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create index profiles_trainer_idx on public.profiles (trainer_id);

-- backfill utente esistente
insert into public.profiles (id, email)
select id, email from auth.users on conflict (id) do nothing;
```

Dopo la migration, nominare il superadmin a mano (una tantum, direttamente su DB perché non c'è ancora un superadmin che possa farlo via RPC):
`update public.profiles set ruolo='superadmin' where email='<email_fabrizio>';`

### 4.2 — `schede.stato` (ciclo di vita invio→archivio)

```sql
alter table public.schede
  add column stato text not null default 'accettata'
  check (stato in ('inviata','accettata'));  -- 'rifiutata' rimandato (D2: no rifiuto in v1)
```

- Default `'accettata'` così le schede già esistenti restano in archivio → **nessuna regressione**.
- L'**archivio** filtra `stato = 'accettata'`; le `'inviata'` vivono solo in Inbox finché non accettate.

### 4.3 — `notifiche` + RLS

```sql
create table public.notifiche (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,  -- destinatario
  tipo          text not null default 'scheda_inviata'
                check (tipo in ('scheda_inviata')),                          -- estendibile (Q1)
  titolo        text not null default '',
  scheda_id     text references public.schede(id) on delete cascade,
  mittente_id   uuid references auth.users(id),
  mittente_nome text default '',
  letta         boolean not null default false,   -- guida il badge (D3)
  stato         text not null default 'pending'
                check (stato in ('pending','accettata')),  -- 'rifiutata' rimandato (D2)
  created_at    timestamptz not null default now(),
  actioned_at   timestamptz
);

alter table public.notifiche enable row level security;

-- solo il destinatario legge/aggiorna le proprie. NESSUNA policy di insert:
-- le notifiche nascono solo dentro le RPC SECURITY DEFINER (che bypassano RLS) → deny-by-default per i client.
create policy "notifiche destinatario read"   on public.notifiche
  for select using (auth.uid() = user_id);
create policy "notifiche destinatario update" on public.notifiche
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index notifiche_user_unread_idx on public.notifiche (user_id) where letta = false;
```

### 4.4 — `audit_log` (traccia azioni privilegiate)

```sql
create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references auth.users(id),
  action     text not null,             -- es. 'invia_scheda','promuovi_trainer','sospendi','riassegna'
  target_id  uuid,                      -- utente bersaglio dell'azione
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

-- solo il superadmin legge. Nessun insert policy: scritto solo dentro le RPC (definer).
create policy "audit superadmin read" on public.audit_log
  for select using (public.is_superadmin(auth.uid()));

create index audit_created_idx on public.audit_log (created_at desc);
```

### 4.5 — RPC invio scheda (trainer→proprio trainee, o superadmin→chiunque)

Il client (preview) genera gli **ID TEXT** dell'albero e passa il payload già revisionato. Gate: superadmin, oppure trainer il cui `trainer_id` combacia col destinatario.

```sql
create or replace function public.invia_scheda(
  target_user_id uuid,
  scheda         jsonb,   -- { id, nome, mese, data_inizio, weeks }
  tipi           jsonb,   -- [ { id, nome, ordine } ]
  blocchi        jsonb,   -- [ { id, tipo_id, ordine, tipo, durata_minuti, giri_target, nota_comune } ]
  esercizi       jsonb,   -- [ { id, tipo_id, blocco_id, titolo, ripetizioni, carico, recupero, note, ordine, sets_target, rest_seconds } ]
  mittente_nome  text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  new_scheda_id text;
begin
  if not (
    public.is_superadmin(auth.uid())
    or ( public.is_trainer(auth.uid())
         and exists (select 1 from public.profiles
                     where id = target_user_id and trainer_id = auth.uid()) )
  ) then
    raise exception 'not authorized to send to this user' using errcode = '42501';
  end if;

  new_scheda_id := scheda->>'id';

  insert into public.schede (id, nome, mese, user_id, data_inizio, weeks, stato)
  values (new_scheda_id, scheda->>'nome', coalesce(scheda->>'mese',''),
          target_user_id, (scheda->>'data_inizio')::date,
          (scheda->>'weeks')::smallint, 'inviata');

  insert into public.tipi (id, scheda_id, nome, ordine, user_id)
  select e->>'id', new_scheda_id, coalesce(e->>'nome',''),
         coalesce((e->>'ordine')::int,0), target_user_id
  from jsonb_array_elements(tipi) e;

  insert into public.blocchi (id, tipo_id, ordine, tipo, durata_minuti, giri_target, nota_comune, user_id)
  select e->>'id', e->>'tipo_id', coalesce((e->>'ordine')::int,0),
         coalesce(e->>'tipo','singolo'),
         nullif(e->>'durata_minuti','')::int, nullif(e->>'giri_target','')::int,
         e->>'nota_comune', target_user_id
  from jsonb_array_elements(blocchi) e;

  insert into public.esercizi (id, tipo_id, blocco_id, titolo, ripetizioni, carico, recupero,
                               note, ordine, user_id, sets_target, rest_seconds)
  select e->>'id', e->>'tipo_id', nullif(e->>'blocco_id',''),
         coalesce(e->>'titolo',''), coalesce(e->>'ripetizioni',''),
         coalesce(e->>'carico',''), coalesce(e->>'recupero',''), coalesce(e->>'note',''),
         coalesce((e->>'ordine')::int,0), target_user_id,
         nullif(e->>'sets_target','')::smallint, nullif(e->>'rest_seconds','')::int
  from jsonb_array_elements(esercizi) e;

  insert into public.notifiche (user_id, tipo, titolo, scheda_id, mittente_id, mittente_nome, stato)
  values (target_user_id, 'scheda_inviata',
          'Nuova scheda inviata da ' || coalesce(mittente_nome,'trainer'),
          new_scheda_id, auth.uid(), mittente_nome, 'pending');

  insert into public.audit_log (actor_id, action, target_id, meta)
  values (auth.uid(), 'invia_scheda', target_user_id, jsonb_build_object('scheda_id', new_scheda_id));

  return new_scheda_id;
end $$;

grant execute on function public.invia_scheda(uuid,jsonb,jsonb,jsonb,jsonb,text) to authenticated;
```

### 4.6 — RPC gestione trainer (solo superadmin)

```sql
-- promuovi/declassa: cambia ruolo
create or replace function public.admin_set_ruolo(target_user_id uuid, nuovo_ruolo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if nuovo_ruolo not in ('trainee','trainer','superadmin') then
    raise exception 'invalid role';
  end if;
  update public.profiles set ruolo = nuovo_ruolo where id = target_user_id;
  insert into public.audit_log (actor_id, action, target_id, meta)
  values (auth.uid(), 'set_ruolo', target_user_id, jsonb_build_object('ruolo', nuovo_ruolo));
end $$;

-- assegna/riassegna un trainee a un trainer (NULL = svincola)
create or replace function public.admin_set_trainer(target_user_id uuid, nuovo_trainer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.profiles set trainer_id = nuovo_trainer_id where id = target_user_id;
  insert into public.audit_log (actor_id, action, target_id, meta)
  values (auth.uid(), 'set_trainer', target_user_id, jsonb_build_object('trainer_id', nuovo_trainer_id));
end $$;

-- sospendi/riattiva
create or replace function public.admin_set_attivo(target_user_id uuid, val boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.profiles set attivo = val where id = target_user_id;
  insert into public.audit_log (actor_id, action, target_id, meta)
  values (auth.uid(), 'set_attivo', target_user_id, jsonb_build_object('attivo', val));
end $$;

-- riassegna in blocco tutti i trainee di un trainer a un altro (quando un trainer se ne va)
create or replace function public.admin_riassegna_trainees(da_trainer uuid, a_trainer uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.profiles set trainer_id = a_trainer where trainer_id = da_trainer;
  get diagnostics n = row_count;
  insert into public.audit_log (actor_id, action, target_id, meta)
  values (auth.uid(), 'riassegna_trainees', da_trainer,
          jsonb_build_object('a_trainer', a_trainer, 'n', n));
  return n;
end $$;

grant execute on function public.admin_set_ruolo(uuid,text)         to authenticated;
grant execute on function public.admin_set_trainer(uuid,uuid)       to authenticated;
grant execute on function public.admin_set_attivo(uuid,boolean)     to authenticated;
grant execute on function public.admin_riassegna_trainees(uuid,uuid) to authenticated;
```

### 4.7 — Gancio libreria esercizi globale (solo RLS — `user_id` è già nullable)

```sql
-- rimpiazza la policy ALL esistente con policy separate che ammettono le righe globali
drop policy "user owns exercises" on public.exercises;

-- lettura: i propri esercizi + quelli globali (user_id IS NULL)
create policy "exercises read own or global" on public.exercises
  for select using (user_id = auth.uid() or user_id is null);

-- scrittura personale: solo i propri; scrittura globale: solo superadmin
create policy "exercises insert" on public.exercises
  for insert with check (
    user_id = auth.uid()
    or (user_id is null and public.is_superadmin(auth.uid()))
  );
create policy "exercises update" on public.exercises
  for update using (
    user_id = auth.uid()
    or (user_id is null and public.is_superadmin(auth.uid()))
  ) with check (
    user_id = auth.uid()
    or (user_id is null and public.is_superadmin(auth.uid()))
  );
create policy "exercises delete" on public.exercises
  for delete using (
    user_id = auth.uid()
    or (user_id is null and public.is_superadmin(auth.uid()))
  );
```

> Le righe esistenti hanno `user_id` valorizzato → restano personali. Nessuna migrazione dati. La libreria vera (UI di gestione del catalogo globale) è §8.

---

## 5. Flussi

### 5.1 — Trainer: upload → parse → check → assegna
1. **Gate UI:** la console trainer è visibile solo se `ruolo ∈ {trainer, superadmin}` (fetch profilo al login, in memoria). Fork superficiale (A9).
2. **Upload PDF** → parser FIX6 client-side → albero Giorno→Blocco→Schede→Esercizi.
3. **Preview editabile** (step più prezioso): campi correggibili (titoli, ripetizioni, carico, `recupero`/`rest_seconds`, tipo blocco, `sets_target`). Attenzione ai recuperi legacy come stringhe `"60"` (fallback FIX5: `rest_seconds` → parse stringa `recupero` → default 90s).
4. **Genera ID TEXT** client-side per scheda/tipi/blocchi/esercizi.
5. **Lista "i miei trainee"** = `profiles where trainer_id = me` (il superadmin vede tutti) → selezione destinatario.
6. **Invia** → `invia_scheda(...)` → scheda `stato='inviata'` di proprietà del trainee + notifica `pending` + riga audit.
7. **Storico schede assegnate** (parte permanente): lista delle schede inviate dal trainer ai suoi trainee. *(Query di lettura sulle schede dei propri trainee — vedi nota RLS sotto.)*

> **Nota RLS storico:** per far vedere al trainer le schede dei suoi trainee serve una policy di lettura su `schede` scoped al legame trainer. Aggiungere:
> ```sql
> create policy "schede trainer read" on public.schede for select using (
>   exists (select 1 from public.profiles p where p.id = schede.user_id and p.trainer_id = auth.uid())
>   or public.is_superadmin(auth.uid())
> );
> ```
> (La policy `users_own_schede` resta per l'accesso del proprietario.)

### 5.2 — Trainee: Inbox → accetta → archivio
1. **Badge** su icona profilo (tab bar) + voce "Inbox" = conteggio notifiche non lette (D3).
2. **Apertura Inbox** → `notifiche where user_id = me order by created_at desc`, formato *"martedì 7 luglio — {titolo}"* (data locale it-IT).
3. **Tap** → dettaglio + preview scheda + **Accetta** (nessun rifiuto in v1).
4. **Accetta** (RLS normali, no privilegi): `schede.stato='accettata'` + `notifiche.stato='accettata', letta=true, actioned_at=now()`. La scheda compare in archivio.
5. **Offline:** entrambe le update passano dalla coda Dexie esistente.

### 5.3 — SuperAdmin: gestione trainer (console isolata)
1. **Lista utenti** (tutti, `is_superadmin`), con ruolo e stato attivo.
2. **Promuovi trainee→trainer**: `admin_set_ruolo(id,'trainer')`.
3. **Assegna trainee a un trainer**: `admin_set_trainer(trainee_id, trainer_id)`.
4. **Sospendi/riattiva trainer**: `admin_set_attivo(id, false/true)`. `attivo=false` è un flag soft che la UI controlla per disabilitare le capacità del trainer (il ban auth vero resta un'azione manuale Supabase — vedi §8).
5. **Riassegna in blocco** i trainee quando un trainer se ne va: `admin_riassegna_trainees(da, a)`.
6. Ogni azione lascia una riga in `audit_log` (visibile solo al superadmin).

---

## 6. UI — badge
- Indipendente da R3 (push): è una **lettura DB**.
- **Sorgente (D1 — solo poll):** query `notifiche` filtrata `user_id=me` **on app-open e on window-focus** (`visibilitychange`). Niente Realtime in v1. `count(*) where letta=false`.
- **Semantica (D3):** badge = **non lette** (`letta=false`), si azzera all'apertura Inbox. In più, marker **"azione richiesta"** sugli item `stato='pending'` nel listing, persistente fino all'accettazione.

---

## 7. Decisioni confermate
- **D1 — badge:** ✅ solo poll (app-open + window-focus).
- **D2 — rifiuto scheda:** ✅ no in v1 (CHECK senza `'rifiutata'`, estendibile poi).
- **D3 — badge:** ✅ non lette + marker "azione richiesta".
- **D4 — livello v1:** ✅ **opzione B** (gestione trainer) + ganci schema.
- **D5 — libreria esercizi:** ✅ gancio RLS ora (righe globali `user_id IS NULL`), UI dopo.

---

## 8. Estensioni future (fuori scope v1, documentate)
- **Libreria esercizi globale (UI):** gestione del catalogo piattaforma da parte del superadmin; i trainer riusano gli esercizi globali nella generazione schede. Schema/RLS già pronti (§4.7) → è solo UI.
- **App trainer dedicata:** lista utenti, calendario lezioni, scheda per-utente, incassi, generazione schede. La console v0 di §5.1/5.3 è la fetta 1; il modello dati (ruoli, `trainer_id`, `invia_scheda`, storico) si porta dietro intatto. Probabile superficie separata (territorio migrazione RN).
- **Libreria template schede:** bozze persistite di proprietà trainer (`stato='bozza'`) + riuso; richiede policy admin di lettura su `schede` + logica di trasferimento.
- **Poteri superadmin avanzati:** dashboard globale con metriche; "vedi come" (impersonation, sempre loggata in audit); notifiche broadcast (nuovo `tipo`); ban auth reale (via Supabase Admin API / Edge Function); limiti/feature-flag e premium per trainer; export/cancellazione dati GDPR.
- **Tipi notifica aggiuntivi** (`progressione`, `messaggio`) → Q1; estendere il CHECK su `notifiche.tipo`.
- **R2/INV1:** l'enum `ruolo` e `trainer_id` sono i precursori dell'onboarding self-serve e del referral. Nessun rework del modello dati.
- **Push reale (R3):** agganciare il push all'`insert` su `notifiche` (trigger → funzione). Il badge in-app resta invariato.

---

## 9. Checklist implementazione (Claude Code)
- [ ] Migration 4.1 (`profiles` + ruoli + `trainer_id` + helper + guard + trigger + backfill) → verificare stato remoto
- [ ] Nominare il superadmin a mano (`ruolo='superadmin'`)
- [ ] Migration 4.2 (`schede.stato`, default `accettata`) → verificare archivio invariato
- [ ] Migration 4.3 (`notifiche` + RLS, no insert policy)
- [ ] Migration 4.4 (`audit_log` + RLS read superadmin)
- [ ] Migration 4.5 (RPC `invia_scheda` + gate scoping + `GRANT EXECUTE`)
- [ ] Migration 4.6 (RPC gestione trainer + `GRANT EXECUTE`)
- [ ] Migration 4.7 (RLS libreria esercizi globale) → verificare che le righe esistenti restino personali
- [ ] Policy `schede trainer read` per lo storico (§5.1 nota)
- [ ] Gate UI console (fetch `ruolo` al login, fork superficiale)
- [ ] UI trainer: upload → parse (FIX6) → **preview editabile** → lista "i miei trainee" → invia → storico
- [ ] Filtro archivio su `stato='accettata'`
- [ ] Inbox: voce menu profilo + listing + dettaglio + **Accetta** (no Rifiuta)
- [ ] Marker "azione richiesta" sugli item `stato='pending'`
- [ ] Badge tab bar + menu profilo: `count(letta=false)`, poll on app-open + window-focus, azzera all'apertura Inbox
- [ ] Console SuperAdmin: lista utenti + promuovi/assegna/sospendi/riassegna (RPC 4.6)
- [ ] Path offline per l'accettazione (coda Dexie)
- [ ] Flag eventuali deviazioni dallo spec **prima** di procedere

---

*Fine spec. Scritture privilegiate: `invia_scheda` + le `admin_*`. Tutto il resto gira con RLS utente standard. Nessuna migration applicata in stesura.*
