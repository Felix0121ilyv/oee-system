// src/app/(app)/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import dynamic from 'next/dynamic';

// Import dinámico del Sidebar - ESTO EVITA EL ERROR
const Sidebar = dynamic(() => import('../../../components/Sidebar'), {
  ssr: false, // 👈 Impide que se renderice en el servidor durante el build
  loading: () => (
    // Placeholder visual mientras se carga en el cliente
    <div className="w-64 bg-gray-900 h-screen animate-pulse">
      <div className="p-4 space-y-4">
        <div className="h-8 bg-gray-700 rounded"></div>
        <div className="h-8 bg-gray-700 rounded"></div>
        <div className="h-8 bg-gray-700 rounded"></div>
      </div>
    </div>
  )
});

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ Esto sigue siendo seguro porque es Server Component
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar /> {/* Ahora se carga solo en el cliente */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

