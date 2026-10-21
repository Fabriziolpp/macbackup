// Costanti di configurazione globali. Quando R1/Preferenze sarà live,
// i valori "utente-default" andranno spostati in user_preferences (Supabase).

// FIX5 SPEC §2.1: fallback finale per la durata del timer di recupero
// quando né esercizio.rest_seconds né parseRecuperoSeconds(recupero)
// producono un valore valido.
export const DEFAULT_REST_SECONDS = 90;
