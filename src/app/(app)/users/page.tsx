'use client';
import { useState, useEffect, useCallback } from 'react';

interface User { id: string; name: string; email: string; role: string; createdAt: string; }

const emptyUser = { name: '', email: '', password: '', role: 'OPERATOR' };
const ROLE_LABELS: Record<string, string> = { ADMIN: 'Administrador', SUPERVISOR: 'Supervisor', OPERATOR: 'Operador' };

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<any>(emptyUser);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        const u = await fetch('/api/users').then(r => r.json());
        setUsers(u);
        setLoading(false);
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const openCreate = () => { setForm(emptyUser); setEditId(null); setShowModal(true); };
    const openEdit = (u: User) => { setForm({ name: u.name, email: u.email, password: '', role: u.role }); setEditId(u.id); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditId(null); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const url = editId ? `/api/users/${editId}` : '/api/users';
        const method = editId ? 'PUT' : 'POST';
        const body = { ...form };
        if (editId && !body.password) delete body.password;
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        await fetchUsers();
        setSaving(false);
        closeModal();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await fetch(`/api/users/${deleteId}`, { method: 'DELETE' });
        setDeleteId(null);
        fetchUsers();
    };

    const getBadgeClass = (role: string) => role === 'ADMIN' ? 'badge-admin' : role === 'SUPERVISOR' ? 'badge-supervisor' : 'badge-operator';

    if (loading) return <div className="loading-center"><div className="spinner" /><span>Cargando usuarios...</span></div>;

    return (
        <div className="fade-in">
            <div className="action-bar">
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <h1>Gestión de Usuarios</h1>
                    <p>{users.length} usuarios registrados</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>➕ Nuevo Usuario</button>
            </div>

            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Creado</th>
                            <th style={{ width: 80 }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0
                                        }}>
                                            {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                                    </div>
                                </td>
                                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#8899b4' }}>{u.email}</td>
                                <td><span className={`badge ${getBadgeClass(u.role)}`}>{ROLE_LABELS[u.role] ?? u.role}</span></td>
                                <td style={{ fontSize: 12, color: '#4a6080' }}>{new Date(u.createdAt).toLocaleDateString('es-MX')}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>✏️</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(u.id)}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Role legend */}
            <div className="card" style={{ marginTop: 16 }}>
                <div className="card-title">📋 Permisos por Rol</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {[
                        { role: 'ADMIN', label: 'Administrador', icon: '👑', perms: ['Gestión de usuarios', 'Configuración del sistema', 'Administra máquinas', 'Todos los reportes y análisis'] },
                        { role: 'SUPERVISOR', label: 'Supervisor', icon: '🎯', perms: ['Registra producción y paradas', 'Dashboard y KPIs', 'Reportes', 'Análisis económico'] },
                        { role: 'OPERATOR', label: 'Operador', icon: '⚙️', perms: ['Registra producción', 'Registra paradas', 'Vista básica de máquinas'] },
                    ].map(r => (
                        <div key={r.role} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <span style={{ fontSize: 20 }}>{r.icon}</span>
                                <span className={`badge ${getBadgeClass(r.role)}`}>{r.label}</span>
                            </div>
                            {r.perms.map(p => (
                                <div key={p} style={{ fontSize: 12, color: '#8899b4', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ color: '#00e68a' }}>✓</span> {p}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">{editId ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}</h2>
                            <button className="modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Nombre completo</label>
                                <input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-control" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{editId ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
                                <input type="password" className="form-control" required={!editId} value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editId ? 'Sin cambio' : '••••••••'} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Rol</label>
                                <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    <option value="OPERATOR">Operador</option>
                                    <option value="SUPERVISOR">Supervisor</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteId && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 380 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">🗑️ Eliminar usuario</h2>
                            <button className="modal-close" onClick={() => setDeleteId(null)}>✕</button>
                        </div>
                        <p style={{ color: '#8899b4', fontSize: 13 }}>¿Confirmas que deseas eliminar este usuario? Esta acción no se puede deshacer.</p>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
