'use client';
import { useState, useEffect, useCallback } from 'react';

interface Config {
    oeeGoal: number;
    stopCostPerMin: number;
    defectCostPerUnit: number;
    productionValuePerUnit: number;
    shifts: string;
    stopReasons: string;
}

export default function ConfigPage() {
    const [config, setConfig] = useState<Config | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [newReason, setNewReason] = useState('');

    const fetchConfig = useCallback(async () => {
        const c = await fetch('/api/config').then(r => r.json());
        setConfig(c);
        setLoading(false);
    }, []);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    if (loading || !config) return <div className="loading-center"><div className="spinner" /><span>Cargando configuración...</span></div>;

    const shifts: string[] = JSON.parse(config.shifts);
    const reasons: string[] = JSON.parse(config.stopReasons);

    const update = (key: keyof Config, value: any) => setConfig(prev => prev ? { ...prev, [key]: value } : null);

    const removeReason = (r: string) => update('stopReasons', JSON.stringify(reasons.filter(x => x !== r)));
    const addReason = () => {
        if (!newReason.trim()) return;
        update('stopReasons', JSON.stringify([...reasons, newReason.trim()]));
        setNewReason('');
    };

    const handleSave = async () => {
        setSaving(true);
        await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const SHIFT_LABELS: Record<string, string> = { MORNING: 'Mañana', AFTERNOON: 'Tarde', NIGHT: 'Noche' };

    return (
        <div className="fade-in">
            <div className="action-bar">
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <h1>Configuración del Sistema</h1>
                    <p>Parámetros globales de OEE y costos</p>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? '⏳ Guardando...' : saved ? '✅ Guardado' : '💾 Guardar Cambios'}
                </button>
            </div>

            {saved && <div className="alert alert-success" style={{ marginBottom: 20 }}>✅ Configuración guardada exitosamente.</div>}

            <div className="grid-2">
                {/* OEE Goal */}
                <div className="card">
                    <div className="card-title">🎯 Meta de OEE</div>
                    <div className="form-group">
                        <label className="form-label">Meta global de OEE (%)</label>
                        <input type="range" min="50" max="100" step="1" value={config.oeeGoal * 100}
                            onChange={e => update('oeeGoal', parseFloat(e.target.value) / 100)}
                            style={{ width: '100%', accentColor: '#00d4ff', marginBottom: 8 }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#4a6080', fontSize: 12 }}>50%</span>
                            <span style={{ fontSize: 28, fontWeight: 800, color: '#00d4ff' }}>{(config.oeeGoal * 100).toFixed(0)}%</span>
                            <span style={{ color: '#4a6080', fontSize: 12 }}>100%</span>
                        </div>
                        <div className="form-hint">Los indicadores se colorean según su distancia a esta meta.</div>
                    </div>
                </div>

                {/* Costs */}
                <div className="card">
                    <div className="card-title">💰 Parámetros Económicos</div>
                    <div className="form-group">
                        <label className="form-label">Costo por minuto de parada (USD)</label>
                        <input type="number" className="form-control" min="0" step="0.01" value={config.stopCostPerMin}
                            onChange={e => update('stopCostPerMin', parseFloat(e.target.value))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Costo por producto defectuoso (USD)</label>
                        <input type="number" className="form-control" min="0" step="0.01" value={config.defectCostPerUnit}
                            onChange={e => update('defectCostPerUnit', parseFloat(e.target.value))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Valor de producción por unidad (USD)</label>
                        <input type="number" className="form-control" min="0" step="0.01" value={config.productionValuePerUnit}
                            onChange={e => update('productionValuePerUnit', parseFloat(e.target.value))} />
                    </div>
                </div>

                {/* Shifts */}
                <div className="card">
                    <div className="card-title">🕐 Turnos</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {['MORNING', 'AFTERNOON', 'NIGHT'].map(s => (
                            <div key={s} style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                                background: shifts.includes(s) ? 'rgba(0,212,255,0.1)' : 'var(--bg-primary)',
                                border: `1px solid ${shifts.includes(s) ? 'rgba(0,212,255,0.3)' : 'var(--border)'}`,
                                borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500
                            }}
                                onClick={() => {
                                    const newShifts = shifts.includes(s) ? shifts.filter(x => x !== s) : [...shifts, s];
                                    update('shifts', JSON.stringify(newShifts));
                                }}>
                                <span style={{ color: shifts.includes(s) ? '#00d4ff' : '#4a6080' }}>
                                    {s === 'MORNING' ? '🌅' : s === 'AFTERNOON' ? '☀️' : '🌙'}
                                </span>
                                <span style={{ color: shifts.includes(s) ? '#e8eef7' : '#4a6080' }}>{SHIFT_LABELS[s]}</span>
                                {shifts.includes(s) && <span style={{ color: '#00d4ff', fontSize: 11 }}>✓</span>}
                            </div>
                        ))}
                    </div>
                    <div className="form-hint" style={{ marginTop: 12 }}>Selecciona los turnos activos en tu planta.</div>
                </div>

                {/* Stop reasons */}
                <div className="card">
                    <div className="card-title">⛔ Motivos de Parada</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                        {reasons.map(r => (
                            <span key={r} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                                background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)',
                                borderRadius: 20, fontSize: 12, color: '#ff8a96'
                            }}>
                                {r}
                                <span style={{ cursor: 'pointer', color: '#ff4757' }} onClick={() => removeReason(r)}>×</span>
                            </span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input className="form-control" placeholder="Nuevo motivo..." value={newReason}
                            onChange={e => setNewReason(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addReason()} />
                        <button className="btn btn-secondary" onClick={addReason}>➕</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
