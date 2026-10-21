-- AP1 Fase 2 (audit RLS): le policy di ownership verificano anche i riferimenti.
--   blocchi:  il tipo padre deve essere dell'utente
--   esercizi: blocco_id ed exercise_id, se presenti, devono essere dell'utente (SEC1)
--   tipi, esercizi: user_id deve essere l'utente
-- Conteggi del 2026-10-20 sulle righe esistenti: 0 violazioni per tutte le regole
-- (57 tipi, 380 esercizi, 21 blocchi). Nessuna modifica ai dati.
-- Ruolo authenticated; (select auth.uid()) per efficienza.

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
    and esercizi.user_id = (select auth.uid())
  );

alter policy users_own_tipi on public.tipi
  to authenticated
  using (
    exists (select 1 from public.schede s where s.id = tipi.scheda_id and s.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.schede s where s.id = tipi.scheda_id and s.user_id = (select auth.uid()))
    and tipi.user_id = (select auth.uid())
  );
