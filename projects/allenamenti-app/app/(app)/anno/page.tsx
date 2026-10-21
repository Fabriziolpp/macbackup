import { redirect } from 'next/navigation';

export default function AnnoRedirect() {
  redirect('/calendario?v=anno');
}
