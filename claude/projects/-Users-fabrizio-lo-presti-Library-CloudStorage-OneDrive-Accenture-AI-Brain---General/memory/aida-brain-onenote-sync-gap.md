---
name: aida-brain-onenote-sync-gap
description: "Latenza di sincronizzazione tra la libreria Teams/SharePoint della KB e il mirror locale che l'assistente legge"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5681237a-90b4-48ba-b13d-0fe40fcf9819
---

Le note della KB di AIDA Brain sono pubblicate (via flusso Power Automate, a partire da OneNote) nella **libreria SharePoint del team Teams "AI Brain"** (canale *Generale* → *Condiviso* → cartella *Appunti One Note*). L'assistente NON legge SharePoint direttamente: legge un **mirror locale** che OneDrive sincronizza da quella libreria, con **latenza di alcuni minuti**.

Conseguenza: una nota appena creata/pubblicata può essere **visibile all'utente in Teams/OneNote ma non ancora presente nel mirror locale** finché OneDrive non la scarica → una ricerca sul filesystem può non trovarla temporaneamente.

Esempio reale (2026-07-22): la nota `AIDA_Campagna_commerciale_PagoPA_Offerta_Luglio.html` è comparsa nel mirror locale alle 12:00; una ricerca precedente non l'aveva trovata perché non ancora sincronizzata.

**Why:** evitare di concludere che una nota "non esiste" quando è solo non ancora sincronizzata.
**How to apply:** se una nota citata non è nel mirror locale, dirlo come possibile latenza di sync (non come assenza definitiva); chiedere di incollare contenuto/screenshot o attendere la sync, poi verificare sul file reale. La KB è già ben posizionata su Teams/SharePoint; il tema è solo il ritardo di download in locale. Vedi [[aida-campaign-tracker-workflow]].
