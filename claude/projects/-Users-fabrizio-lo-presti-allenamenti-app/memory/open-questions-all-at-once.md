---
name: open-questions-all-at-once
description: "Per chiudere punti aperti l'utente vuole tutte le domande in un solo messaggio, con opzioni e raccomandazione — niente meta-domande né una domanda per volta"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 63065d2a-d675-4fe2-8452-feef23d04466
  modified: 2026-10-13T13:49:01.332Z
---

Quando ci sono punti aperti da decidere, l'utente vuole **tutte le domande necessarie in un unico messaggio**: numerate, raggruppate per tema, con opzioni A/B/C e la raccomandazione marcata, così può rispondere in blocco (es. "tutto come consigli tranne 3B").

**Why:** il 2026-10-13 ha rifiutato una chiamata AskUserQuestion con una sola meta-domanda ("su quale parte facciamo il brainstorming?") e ha chiesto: "fammi tutte le domande necessarie a chiudere i punti aperti in modo che possiamo procedere".

**How to apply:** non chiedere "su cosa lavoriamo" se il contesto lo rende chiaro; non spezzare in una domanda per messaggio (prevale sulla regola "one question at a time" della skill brainstorming); usare una lista testuale in chat. Coerente con [[backlog-source-of-truth]] (decisioni aperte presentate con raccomandazioni).
