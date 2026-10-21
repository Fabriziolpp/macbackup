---
name: push-gate-main
description: Prima di ogni push su main servono build e prova manuale del flusso Live; i commit rimasti solo locali si pubblicano dopo git show --stat e ok esplicito
metadata:
  node_type: memory
  type: feedback
  originSessionId: 63065d2a-d675-4fe2-8452-feef23d04466
  modified: 2026-10-20T20:42:36.337Z
---

Ogni push su `main` va in produzione (deploy Vercel automatico). Prima di ogni push servono **build e prova manuale del flusso Live** (login → Live → salvataggio allenamento). La prova la fa Fabrizio, con l'utente di test; io avvio il server locale e gli preparo la checklist, perché non posso usare un browser.

Se il push pubblica commit rimasti solo in locale (es. `dcf9907`, tenuto locale dal 2026-07-14), prima mostro `git show --stat <commit>` e aspetto il suo ok.

**Why:** risposte del 2026-10-13 sulla Fase 2 di AP1, che si rilascia a piccoli passi su main.

Dettagli aggiunti il 2026-10-14:
- la prova Live va **rifatta per intero a ogni push**, non solo nei passi toccati;
- la checklist si mostra a Fabrizio **prima** di eseguirla;
- dopo il push si verifica che il deploy Vercel sia andato. Il repo è privato, quindi lo stato GitHub non si legge senza token: il segnale è una route eliminata che in produzione passa da 401 a 404. Poi si dà a Fabrizio una mini-checklist di prova in produzione.

Dal 2026-10-20 il token GitHub è nel portachiavi di macOS: il primo push l'ha fatto Fabrizio dal Terminale. I push successivi li fa la sessione con `git push`, dopo l'«ok» di Fabrizio. Il `!` di Claude Code non regge i prompt interattivi (`Device not configured`): per git interattivo serve il Terminale di macOS.

**How to apply:** mai pushare su main senza i due passaggi. Il primo push dopo la rimozione del token dall'URL di origin lo fa lui con `! git push`, per inserire la nuova credenziale nel portachiavi. Vedi [[supabase-prod-safety]].
