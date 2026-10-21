import { redirect } from 'next/navigation';

export default function SettimanaRedirect() {
  redirect('/calendario?v=settimana');
}
