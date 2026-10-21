---
name: aida-campaign-tracker-workflow
description: "Comandi per alimentare l'Excel di tracciamento della campagna commerciale AIDA"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5681237a-90b4-48ba-b13d-0fe40fcf9819
---

Registro campagna commerciale AIDA: file `Knowledge base/AIDA_Campagna_Commerciale/AIDA_Tracciatura_Campagna_Commerciale_v2.xlsx` (posizione canonica designata 2026-07-16; schema a 17 colonne, fogli `Campagna` + `Storico` + `Istruzioni`; menù a tendina su Industry/Stato/Priorità/Win probability/Owner). Fonte dati originaria (v1): `Knowledge base/Offerte al cliente/AIDA_Offerta_Tracciatura_Campagna_Commerciale.xlsx`. Istruzioni anche in `istruzioni tracciatura campagna commerciale.txt` (root del progetto).

Tre comandi utente per manutenerlo via AIDA Brain:
1. **«traccia sul cliente X questa conversazione/nota»** → aggiorna la riga esistente del cliente X (campi derivati: Sintesi, Stato, Action Point, Ultimo aggiornamento, Owner/Priorità se emergono, Fonte) + voce nello Storico. Se X non esiste, crearlo solo dopo conferma.
2. **«traccia sul file di campagna questa conversazione/nota»** → cliente NON indicato: dedurlo dal contenuto e aggiungere una NUOVA riga (17 colonne) + voce nello Storico. Se l'Account (+Perimetro/Divisione) esiste già, evitare doppioni (chiedere).
3. **«aggiorna la tracciatura dal meeting <nota>»** → leggere la nota del meeting settimanale (spesso generata con Copilot), segmentarla per cliente e applicare a ciascuno la logica del Comando 1 (update) o 2 (nuova riga); Ultimo aggiornamento = data del meeting, Aggiornato da = "Review settimanale"; anteprima consolidata + scrittura in blocco dopo conferma; i clienti non citati restano invariati. In caso di dubbi (identità ambigua, nuovo-vs-update, conflitti col file, campi a vocabolario, citazioni di sfuggita) FARE DOMANDE tutte insieme prima di scrivere.

Regole comuni: compilare sempre Fonte + Ultimo aggiornamento + Sintesi + Action Point; i campi a vocabolario (Industry/Stato/Priorità/Win/Owner) dedurli dove possibile marcandoli come "dedotti", lasciando vuoto ciò che non è desumibile (niente invenzioni); mostrare la bozza/anteprima e scrivere solo dopo conferma (file condiviso), salvo richiesta esplicita "senza conferma"; operare sul file canonico designato.

**Why:** l'utente vuole alimentare il tracker senza lavoro manuale e con tracciabilità delle fonti, coerente con AIDA Brain (vedi [[aida-brain-knowledge-base]]).
**How to apply:** quando l'utente usa uno di questi comandi, riconoscere quale dei tre (update cliente noto / aggiunta nuova riga / aggiornamento in blocco da meeting) e seguire le regole comuni.
