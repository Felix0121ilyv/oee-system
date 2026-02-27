'use client';
import { useState, useEffect, useCallback } from 'react';
import { getOEEColor } from '@/lib/oee';

interface Machine {
    id: string;
    name: string;
    area: string;
    idealSpeed: number;
    plannedTime: number;
    active: boolean;
    createdAt: string;
}

const emptyMachine = { name: '', area: '', idealSpeed: '', plannedTime: '', active: true };

export default function MachinesPage() {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<any>(emptyMachine);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchMachines = useCallback(async () => {
        const r = await fetch('/api/machines');
        const data = await r.json();
        setMachines(data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchMachines(); }, [fetchMachines]);

    const openCreate = () => { setForm(emptyMachine); setEditId(null); setShowModal(true); };
    const openEdit = (m: Machine) => { setForm({ name: m.name, area: m.area, idealSpeed: m.idealSpeed, plannedTime: m.plannedTime, active: m.active }); setEditId(m.id); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditId(null); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const url = editId ? `/api/machines/${editId}` : '/api/machines';
        const method = editId ? 'PUT' : 'POST';
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        await fetchMachines();
        setSaving(false);
        closeModal();
    };

    const handleToggleActive = async (m: Machine) => {
        await fetch(`/api/machines/${m.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...m, active: !m.active }) });
        fetchMachines();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await fetch(`/api/machines/${deleteId}`, { method: 'DELETE' });
        setDeleteId(null);
        fetchMachines();
    };

    if (loading) return <div className="loading-center"><div className="spinner" /><span>Cargando máquinas...</span></div>;

    return (
        <div className="fade-in">
            <div className="action-bar">
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <h1>Gestión de Máquinas</h1>
                    <p>{machines.length} máquinas registradas</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>➕ Nueva Máquina</button>
            </div>

            <div className="grid-3">
                {machines.map(m => (
                    <div key={m.id} className="card" style={{ borderColor: m.active ? 'var(--border)' : 'rgba(255,71,87,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span className={`status-dot ${m.active ? 'active' : 'inactive'}`} />
                                    <h3 style={{ fontSize: 14, fontWeight: 700 }}>{m.name}</h3>
                                </div>
                                <div style={{ fontSize: 11, color: '#8899b4' }}>📍 {m.area}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(m)}>✏️</button>
                                <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(m.id)}>🗑️</button>
                            </div>
                        </div>

                        <div className="divider" />

                        <div className="metric-row">
                            <span className="metric-label">⚡ Velocidad ideal</span>
                            <span className="metric-value">{m.idealSpeed} u/min</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">⏱️ Tiempo planificado</span>
                            <span className="metric-value">{m.plannedTime} min/turno</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">🎯 Cap. turno ideal</span>
                            <span className="metric-value">{(m.idealSpeed * m.plannedTime).toLocaleString()} u</span>
                        </div>

                        <div className="divider" />

                        <button
                            className={`btn ${m.active ? 'btn-danger' : 'btn-primary'} btn-sm`}
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => handleToggleActive(m)}
                        >
                            {m.active ? '⏸ Desactivar' : '▶ Activar'}
                        </button>
                    </div>
                ))}
            </div>

            {machines.length === 0 && (
                <div className="card empty-state">
                    <div className="icon">⚙️</div>
                    <h3>No hay máquinas registradas</h3>
                    <p>Crea tu primera máquina para comenzar.</p>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">{editId ? '✏️ Editar Máquina' : '➕ Nueva Máquina'}</h2>
                            <button className="modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Nombre</label>
                                <input className="form-control" required value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Línea A - Ensamble" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Área / Proceso</label>
                                <input className="form-control" required value={form.area}
                                    onChange={e => setForm({ ...form, area: e.target.value })} placeholder="Ej: Producción" />
                            </div>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Velocidad Ideal (u/min)</label>
                                    <input type="number" className="form-control" required min="0" step="0.1" value={form.idealSpeed}
                                        onChange={e => setForm({ ...form, idealSpeed: e.target.value })} placeholder="80" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tiempo Planificado (min/turno)</label>
                                    <input type="number" className="form-control" required min="0" value={form.plannedTime}
                                        onChange={e => setForm({ ...form, plannedTime: e.target.value })} placeholder="480" />
                                </div>
                            </div>
                            <div className="form-group" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <input type="checkbox" id="activeCheck" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
                                <label htmlFor="activeCheck" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>Máquina activa</label>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteId && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 380 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">🗑️ Confirmar eliminación</h2>
                            <button className="modal-close" onClick={() => setDeleteId(null)}>✕</button>
                        </div>
                        <p style={{ color: '#8899b4', fontSize: 13 }}>¿Deseas eliminar esta máquina? Esta acción eliminará también todos sus registros de producción y paradas.</p>
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
