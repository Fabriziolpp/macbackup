// Server Component — esporta dynamic per evitare pre-rendering statico
export const dynamic = 'force-dynamic';

import AppLayoutClient from './AppLayoutClient';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutClient>{children}</AppLayoutClient>;
}
