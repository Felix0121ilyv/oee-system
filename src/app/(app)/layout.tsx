import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

const Sidebar = dynamic(() => import('../../components/Sidebar'), {
  ssr: false,
});

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

