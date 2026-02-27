// src/app/(app)/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import dynamic from 'next/dynamic';

// Import dinámico del Sidebar - ESTA ES LA CLAVE
const Sidebar = dynamic(() => import('../../components/Sidebar'), {
  ssr: false, // Previene el error de useSession() durante el build
  loading: () => (
    <div className="w-64 bg-gray-900 h-screen animate-pulse">
      {/* Placeholder mientras carga */}
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
  // Verificación de sesión en servidor (esto sí puede ser async)
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar ahora se carga solo en cliente */}
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

