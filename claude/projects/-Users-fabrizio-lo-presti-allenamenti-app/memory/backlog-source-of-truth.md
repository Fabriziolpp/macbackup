---
name: backlog-source-of-truth
description: docs/BACKLOG.md is the official source of truth for the allenamenti-app backlog
metadata: 
  node_type: memory
  type: project
  originSessionId: 6e3adec2-0064-4ae9-9788-223c566b3744
---

`docs/BACKLOG.md` è la fonte di verità ufficiale per feature aperte, decisioni prese e lavoro completato dell'app allenamenti (Vi.To). Dichiarato dall'utente il 2026-06-21.

**Why:** l'utente vuole un unico documento canonico; se la memoria o altro contraddicono il file, **il file vince sempre**.

**How to apply:** quando si rivede/decide su voci del backlog, sciogliere i punti aperti e scrivere le decisioni risolte direttamente in `docs/BACKLOG.md` (con data), poi committarlo. Pattern di lavoro preferito: rivedere una voce alla volta, presentare le decisioni aperte con raccomandazioni, far decidere all'utente, registrare l'esito nel file. Item già sciolti (2026-06-21): R4, FIX5b, F8. Ordine di lavoro indicato dall'utente: R4 → FIX5b → F7 → F8.

**Convenzione commit (dal 2026-06-23):** `docs/BACKLOG.md` va **sempre committato dopo ogni modifica**, in un commit dedicato (prefisso `docs:`), per mantenere uno storico. Non lasciarlo nel working tree non committato. Vale anche quando la modifica è un semplice aggiornamento di stato.

**AP1 (dal 2026-10-13):** Fabrizio può aggiornare il file da sé e chiedermi solo di committarlo: in quel caso non lo riscrivo, lo committo così com'è. Durante AP1 posso spuntare le checklist e aggiornare lo stato della sezione AP1; le priorità non le cambio senza chiedergli. Regole di rilascio: [[push-gate-main]].
