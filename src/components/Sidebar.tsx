'use client';
import { signOut } from 'next-auth/react'; // 👈 Solo importa signOut
import { useClientSession } from '../hooks/useClientSession'; // 👈 Hook seguro
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';

const navItems = [/* ... tu array existente ... */];

export default function Sidebar() {
    const { data: session, status } = useClientSession(); // 👈 AHORA ES SEGURO
    const pathname = usePathname();
    const router = useRouter();
    
    // useEffect para redirección (también seguro porque está en cliente)
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    // Durante SSR o carga, retorna null o un placeholder
    if (status === 'loading' || !session) {
        return (
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">⚡</div>
                    <div className="sidebar-logo-text">
                        <h2>OEE System</h2>
                        <span>Cargando...</span>
                    </div>
                </div>
                <div className="sidebar-nav">
                    <div className="nav-item" style={{ opacity: 0.5 }}>
                        <span className="nav-icon">⏳</span>
                        <span>Cargando...</span>
                    </div>
                </div>
            </aside>
        );
    }

    const role = (session?.user as any)?.role as string;
    const initials = session.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? 'U';

    return (/* ... tu JSX existente ... */);
}
