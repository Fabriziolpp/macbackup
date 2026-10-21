// Carica .env.local nel processo dei test (Node ≥ 20.12) senza stamparne i valori,
// e verifica che ci sia tutto il necessario.
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'TEST_USER_EMAIL',
  'TEST_USER_PASSWORD',
  'TEST_USER_2_EMAIL',
  'TEST_USER_2_PASSWORD',
];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  throw new Error(`Variabili mancanti in .env.local: ${missing.join(', ')}`);
}
