'use client';
import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';

const navItems = [
    { href: '/dashboard', icon: '📊', label: 'Dashboard', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] },
    { href: '/machines', icon: '⚙️', label: 'Máquinas', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] },
    { href: '/production', icon: '🏭', label: 'Producción', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] },
    { href: '/stoppages', icon: '⛔', label: 'Paradas', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] },
    { href: '/losses', icon: '💰', label: 'Pérdidas Económicas', roles: ['ADMIN', 'SUPERVISOR'] },
    { href: '/reports', icon: '📈', label: 'Reportes', roles: ['ADMIN', 'SUPERVISOR'] },
    { href: '/config', icon: '🔧', label: 'Configuración', roles: ['ADMIN'] },
    { href: '/users', icon: '👥', label: 'Usuarios', roles: ['ADMIN'] },
];

export default function Sidebar() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const role = (session?.user as any)?.role as string;

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    if (status === 'loading' || !session) return null;

    const initials = session.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? 'U';

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">⚡</div>
                <div className="sidebar-logo-text">
                    <h2>OEE System</h2>
                    <span>Industrial Analytics</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section-label">Módulos</div>
                {navItems
                    .filter(item => item.roles.includes(role))
                    .map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
            </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">{initials}</div>
                    <div className="user-details">
                        <h4>{session.user?.name}</h4>
                        <span>{role}</span>
                    </div>
                </div>
                <button className="btn-logout" onClick={() => signOut({ callbackUrl: '/login' })}>
                    <span>🚪</span>
                    Cerrar sesión
                </button>
            </div>
        </aside>
    );
}
