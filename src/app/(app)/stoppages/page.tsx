'use client';
import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Machine { id: string; name: string; area: string; }
interface Stoppage {
    id: string; machineId: string; reason: string; type: string;
    duration: number; date: string; observations?: string;
    machine: Machine; user: { name: string };
}
interface Config { stopReasons: string; shifts: string; }

export default function StoppagesPage() {
    const [stoppages, setStoppages] = useState<Stoppage[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [config, setConfig] = useState<Config | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [filterMachine, setFilterMachine] = useState('');
    const [filterType, setFilterType] = useState('');
    const [form, setForm] = useState({ machineId: '', reason: '', type: 'UNPLANNED', duration: '', date: new Date().toISOString().split('T')[0], observations: '' });

    const fetchAll = useCallback(async () => {
        const [s, m, c] = await Promise.all([
            fetch('/api/stoppages').then(r => r.json()),
            fetch('/api/machines').then(r => r.json()),
            fetch('/api/config').then(r => r.json()),
        ]);
        setStoppages(s); setMachines(m); setConfig(c); setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const reasons = config ? JSON.parse(config.stopReasons) as string[] : [];

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await fetch('/api/stoppages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        await fetchAll();
        setSaving(false);
        setShowModal(false);
        setForm({ machineId: '', reason: '', type: 'UNPLANNED', duration: '', date: new Date().toISOString().split('T')[0], observations: '' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta parada?')) return;
        await fetch(`/api/stoppages/${id}`, { method: 'DELETE' });
        fetchAll();
    };

    // Pareto data
    const reasonMap: Record<string, number> = {};
    stoppages.forEach(s => { reasonMap[s.reason] = (reasonMap[s.reason] ?? 0) + s.duration; });
    const paretoData = Object.entries(reasonMap).sort((a, b) => b[1] - a[1]).map(([reason, duration]) => ({ reason, duration }));
    const totalDuration = stoppages.reduce((s, p) => s + p.duration, 0);

    const filtered = stoppages.filter(s =>
        (!filterMachine || s.machineId === filterMachine) &&
        (!filterType || s.type === filterType)
    );

    if (loading) return <div className="loading-center"><div className="spinner" /><span>Cargando...</span></div>;

    return (
        <div className="fade-in">
            <div className="action-bar">
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <h1>Registro de Paradas</h1>
                    <p>{stoppages.length} paradas — {totalDuration.toFixed(0)} min totales</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Registrar Parada</button>
            </div>

            <div className="grid-3-2" style={{ marginBottom: 20 }}>
                {/* Summary cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 14 }}>
                        <div className="card" style={{ flex: 1, borderColor: 'rgba(255,71,87,0.3)' }}>
                            <div style={{ fontSize: 11, color: '#4a6080', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>⛔ No Planificadas</div>
                            <div style={{ fontSize: 26, fontWeight: 800, color: '#ff4757' }}>
                                {stoppages.filter(s => s.type === 'UNPLANNED').length}
                            </div>
                            <div style={{ fontSize: 11, color: '#4a6080' }}>{stoppages.filter(s => s.type === 'UNPLANNED').reduce((s, p) => s + p.duration, 0).toFixed(0)} min</div>
                        </div>
                        <div className="card" style={{ flex: 1, borderColor: 'rgba(0,212,255,0.3)' }}>
                            <div style={{ fontSize: 11, color: '#4a6080', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>📋 Planificadas</div>
                            <div style={{ fontSize: 26, fontWeight: 800, color: '#00d4ff' }}>
                                {stoppages.filter(s => s.type === 'PLANNED').length}
                            </div>
                            <div style={{ fontSize: 11, color: '#4a6080' }}>{stoppages.filter(s => s.type === 'PLANNED').reduce((s, p) => s + p.duration, 0).toFixed(0)} min</div>
                        </div>
                    </div>

                    {/* Pareto chart */}
                    <div className="card" style={{ flex: 1 }}>
                        <div className="card-title">📊 Pareto de Causas (min totales)</div>
                        <div style={{ height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={paretoData.slice(0, 7)} layout="vertical" margin={{ left: 0, right: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: '#4a6080', fontSize: 10 }} />
                                    <YAxis type="category" dataKey="reason" width={120} tick={{ fill: '#8899b4', fontSize: 10 }} />
                                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [`${v} min`, '']} />
                                    <Bar dataKey="duration" radius={[0, 4, 4, 0]}>
                                        {paretoData.slice(0, 7).map((_, i) => (
                                            <Cell key={i} fill={`rgba(255,71,87,${1 - i * 0.1})`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Top reasons list */}
                <div className="card">
                    <div className="card-title">🏆 Ranking de Causas</div>
                    {paretoData.slice(0, 8).map((item, i) => (
                        <div key={item.reason}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                                <div className={`rank-badge rank-${i + 1 <= 3 ? i + 1 : 'other'}`}>{i + 1}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{item.reason}</div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{
                                            width: `${paretoData[0].duration > 0 ? (item.duration / paretoData[0].duration) * 100 : 0}%`,
                                            background: i === 0 ? '#ff4757' : i === 1 ? '#ffb800' : '#00d4ff',
                                        }} />
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#8899b4', whiteSpace: 'nowrap' }}>{item.duration.toFixed(0)} min</div>
                            </div>
                            <div className="divider" style={{ margin: '0' }} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Filters + Table */}
            <div className="filters-bar">
                <select className="form-control" value={filterMachine} onChange={e => setFilterMachine(e.target.value)}>
                    <option value="">Todas las máquinas</option>
                    {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">Todos los tipos</option>
                    <option value="PLANNED">Planificada</option>
                    <option value="UNPLANNED">No planificada</option>
                </select>
                <span style={{ fontSize: 12, color: '#4a6080' }}>{filtered.length} registros</span>
            </div>

            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Máquina</th>
                            <th>Tipo</th>
                            <th>Motivo</th>
                            <th>Duración</th>
                            <th>Observaciones</th>
                            <th>Registrado por</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.slice(0, 50).map(s => (
                            <tr key={s.id}>
                                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{new Date(s.date).toLocaleDateString('es-MX')}</td>
                                <td>
                                    <div style={{ fontWeight: 500 }}>{s.machine?.name}</div>
                                    <div style={{ fontSize: 11, color: '#4a6080' }}>{s.machine?.area}</div>
                                </td>
                                <td><span className={`badge ${s.type === 'PLANNED' ? 'badge-planned' : 'badge-unplanned'}`}>{s.type === 'PLANNED' ? 'Planificada' : 'No planificada'}</span></td>
                                <td>{s.reason}</td>
                                <td style={{ fontWeight: 600, color: s.type === 'UNPLANNED' ? '#ff4757' : '#00d4ff' }}>{s.duration} min</td>
                                <td style={{ fontSize: 11, color: '#8899b4', maxWidth: 200 }}>{s.observations ?? '—'}</td>
                                <td style={{ fontSize: 11, color: '#8899b4' }}>{s.user?.name}</td>
                                <td><button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(s.id)}>🗑️</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && <div className="empty-state"><div className="icon">⛔</div><h3>Sin paradas registradas</h3></div>}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">➕ Registrar Parada</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Máquina</label>
                                    <select className="form-control" required value={form.machineId} onChange={e => setForm({ ...form, machineId: e.target.value })}>
                                        <option value="">Seleccionar...</option>
                                        {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tipo</label>
                                    <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        <option value="UNPLANNED">No planificada</option>
                                        <option value="PLANNED">Planificada</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Motivo</label>
                                    <select className="form-control" required value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
                                        <option value="">Seleccionar...</option>
                                        {reasons.map((r: string) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Duración (minutos)</label>
                                    <input type="number" className="form-control" required min="0" step="0.5" value={form.duration}
                                        onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="30" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Fecha</label>
                                <input type="date" className="form-control" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Observaciones (opcional)</label>
                                <textarea className="form-control" rows={3} value={form.observations}
                                    onChange={e => setForm({ ...form, observations: e.target.value })} placeholder="Descripción detallada..." style={{ resize: 'vertical' }} />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
