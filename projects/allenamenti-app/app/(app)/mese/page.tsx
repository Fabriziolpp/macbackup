import { redirect } from 'next/navigation';

export default function MeseRedirect() {
  redirect('/calendario?v=mese');
}
