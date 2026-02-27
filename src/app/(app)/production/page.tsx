'use client';
import { useState, useEffect, useCallback } from 'react';
import { calculateOEE, formatPercent, formatCurrency, getOEEColor } from '../../../lib/oee';

interface Machine { id: string; name: string; area: string; idealSpeed: number; plannedTime: number; }
interface ProductionRecord {
    id: string; machineId: string; date: string; shift: string;
    totalProduction: number; defects: number; operativeTime: number;
    machine: Machine; user: { name: string };
}
interface Config { stopCostPerMin: number; defectCostPerUnit: number; productionValuePerUnit: number; oeeGoal: number; shifts: string; }

const SHIFTS_LABELS: Record<string, string> = { MORNING: 'Mañana', AFTERNOON: 'Tarde', NIGHT: 'Noche' };

export default function ProductionPage() {
    const [records, setRecords] = useState<ProductionRecord[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [config, setConfig] = useState<Config | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [filterMachine, setFilterMachine] = useState('');
    const [filterShift, setFilterShift] = useState('');
    const [form, setForm] = useState({ machineId: '', shift: 'MORNING', date: new Date().toISOString().split('T')[0], totalProduction: '', defects: '', operativeTime: '' });

    const fetchAll = useCallback(async () => {
        const [rec, mach, cfg] = await Promise.all([
            fetch('/api/production').then(r => r.json()),
            fetch('/api/machines').then(r => r.json()),
            fetch('/api/config').then(r => r.json()),
        ]);
        setRecords(rec); setMachines(mach); setConfig(cfg); setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await fetch('/api/production', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        await fetchAll();
        setSaving(false);
        setShowModal(false);
        setForm({ machineId: '', shift: 'MORNING', date: new Date().toISOString().split('T')[0], totalProduction: '', defects: '', operativeTime: '' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este registro?')) return;
        await fetch(`/api/production/${id}`, { method: 'DELETE' });
        fetchAll();
    };

    const filtered = records.filter(r =>
        (!filterMachine || r.machineId === filterMachine) &&
        (!filterShift || r.shift === filterShift)
    );

    if (loading) return <div className="loading-center"><div className="spinner" /><span>Cargando...</span></div>;

    return (
        <div className="fade-in">
            <div className="action-bar">
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <h1>Registro de Producción</h1>
                    <p>{records.length} registros en total</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Nuevo Registro</button>
            </div>

            <div className="filters-bar">
                <select className="form-control" value={filterMachine} onChange={e => setFilterMachine(e.target.value)}>
                    <option value="">Todas las máquinas</option>
                    {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select className="form-control" value={filterShift} onChange={e => setFilterShift(e.target.value)}>
                    <option value="">Todos los turnos</option>
                    <option value="MORNING">Mañana</option>
                    <option value="AFTERNOON">Tarde</option>
                    <option value="NIGHT">Noche</option>
                </select>
                <span style={{ fontSize: 12, color: '#4a6080' }}>{filtered.length} registros</span>
            </div>

            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Máquina</th>
                            <th>Turno</th>
                            <th>Producción</th>
                            <th>Defectos</th>
                            <th>T. Operativo</th>
                            <th>Disponib.</th>
                            <th>Rendim.</th>
                            <th>Calidad</th>
                            <th>OEE</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.slice(0, 50).map(r => {
                            const machine = machines.find(m => m.id === r.machineId);
                            const oeeData = machine
                                ? calculateOEE(r.operativeTime, machine.plannedTime, r.totalProduction, r.defects, machine.idealSpeed)
                                : null;
                            return (
                                <tr key={r.id}>
                                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                                        {new Date(r.date).toLocaleDateString('es-MX')}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{r.machine?.name}</div>
                                        <div style={{ fontSize: 11, color: '#4a6080' }}>{r.machine?.area}</div>
                                    </td>
                                    <td><span className="badge badge-good">{SHIFTS_LABELS[r.shift] ?? r.shift}</span></td>
                                    <td>{r.totalProduction.toLocaleString()}</td>
                                    <td style={{ color: r.defects > 0 ? '#ff4757' : '#00e68a' }}>{r.defects}</td>
                                    <td>{r.operativeTime.toFixed(0)} min</td>
                                    {oeeData ? (
                                        <>
                                            <td style={{ color: '#00d4ff' }}>{formatPercent(oeeData.availability)}</td>
                                            <td style={{ color: '#ffb800' }}>{formatPercent(oeeData.performance)}</td>
                                            <td style={{ color: '#00e68a' }}>{formatPercent(oeeData.quality)}</td>
                                            <td><strong style={{ color: getOEEColor(oeeData.oee) }}>{formatPercent(oeeData.oee)}</strong></td>
                                        </>
                                    ) : <td colSpan={4}>—</td>}
                                    <td>
                                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(r.id)}>🗑️</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && <div className="empty-state"><div className="icon">🏭</div><h3>Sin registros</h3></div>}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">➕ Nuevo Registro de Producción</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Máquina</label>
                                    <select className="form-control" required value={form.machineId} onChange={e => setForm({ ...form, machineId: e.target.value })}>
                                        <option value="">Seleccionar...</option>
                                        {machines.filter(m => m).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Turno</label>
                                    <select className="form-control" value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}>
                                        <option value="MORNING">Mañana</option>
                                        <option value="AFTERNOON">Tarde</option>
                                        <option value="NIGHT">Noche</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Fecha</label>
                                <input type="date" className="form-control" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Producción Total (unidades)</label>
                                    <input type="number" className="form-control" required min="0" value={form.totalProduction} onChange={e => setForm({ ...form, totalProduction: e.target.value })} placeholder="0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Defectos (unidades)</label>
                                    <input type="number" className="form-control" required min="0" value={form.defects} onChange={e => setForm({ ...form, defects: e.target.value })} placeholder="0" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tiempo Operativo (minutos)</label>
                                <input type="number" className="form-control" required min="0" step="0.1" value={form.operativeTime} onChange={e => setForm({ ...form, operativeTime: e.target.value })} placeholder="480" />
                                <div className="form-hint">Tiempo real de operación de la máquina en el turno.</div>
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

