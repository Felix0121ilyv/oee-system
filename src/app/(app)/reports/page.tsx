'use client';
import { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { calculateOEE, formatCurrency, getOEEColor } from '../../../lib/oee';

interface Machine { id: string; name: string; idealSpeed: number; plannedTime: number; }
interface ProductionRecord { machineId: string; totalProduction: number; defects: number; operativeTime: number; date: string; shift: string; }
interface Stoppage { machineId: string; duration: number; date: string; }

export default function ReportsPage() {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 14); return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterMachine, setFilterMachine] = useState('');
    const [filterShift, setFilterShift] = useState('');
    const [trendData, setTrendData] = useState<any[]>([]);
    const [summaryRows, setSummaryRows] = useState<any[]>([]);

    const fetchMachines = useCallback(async () => {
        const m = await fetch('/api/machines').then(r => r.json());
        setMachines(m);
    }, []);

    useEffect(() => { fetchMachines(); }, [fetchMachines]);

    const runReport = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ from: fromDate, to: toDate });
        if (filterMachine) params.set('machineId', filterMachine);
        if (filterShift) params.set('shift', filterShift);

        const [prods, stops] = await Promise.all([
            fetch(`/api/production?${params}`).then(r => r.json()) as Promise<ProductionRecord[]>,
            fetch(`/api/stoppages?from=${fromDate}&to=${toDate}${filterMachine ? `&machineId=${filterMachine}` : ''}`).then(r => r.json()) as Promise<Stoppage[]>,
        ]);

        // Build per-day trend
        const dayMap: Record<string, { date: string; prods: ProductionRecord[]; stops: Stoppage[] }> = {};
        prods.forEach(p => {
            const d = p.date.split('T')[0];
            if (!dayMap[d]) dayMap[d] = { date: d, prods: [], stops: [] };
            dayMap[d].prods.push(p);
        });
        stops.forEach(s => {
            const d = s.date.split('T')[0];
            if (!dayMap[d]) dayMap[d] = { date: d, prods: [], stops: [] };
            dayMap[d].stops.push(s);
        });

        const avgIdeal = machines.length > 0 ? machines.reduce((s, m) => s + m.idealSpeed, 0) / machines.length : 80;
        const avgPlanned = machines.length > 0 ? machines.reduce((s, m) => s + m.plannedTime, 0) / machines.length : 480;

        const trend = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)).map(d => {
            const totalOT = d.prods.reduce((s, p) => s + p.operativeTime, 0);
            const totalPT = d.prods.length * avgPlanned;
            const totalProd = d.prods.reduce((s, p) => s + p.totalProduction, 0);
            const totalDef = d.prods.reduce((s, p) => s + p.defects, 0);
            const comp = totalPT > 0 ? calculateOEE(totalOT, totalPT, totalProd, totalDef, avgIdeal) : { oee: 0, availability: 0, performance: 0, quality: 0 };
            return {
                date: d.date.slice(5),
                OEE: Math.round(comp.oee * 1000) / 10,
                Disponibilidad: Math.round(comp.availability * 1000) / 10,
                Rendimiento: Math.round(comp.performance * 1000) / 10,
                Calidad: Math.round(comp.quality * 1000) / 10,
                Producción: totalProd,
                Defectos: totalDef,
            };
        });

        // Per-machine summary
        const machSummary = machines.map(m => {
            const mp = prods.filter(p => p.machineId === m.id);
            const ms = stops.filter(s => s.machineId === m.id);
            const totalOT = mp.reduce((s, p) => s + p.operativeTime, 0);
            const totalPT = mp.length * m.plannedTime;
            const totalProd = mp.reduce((s, p) => s + p.totalProduction, 0);
            const totalDef = mp.reduce((s, p) => s + p.defects, 0);
            const totalStop = ms.reduce((s, s2) => s + s2.duration, 0);
            const comp = totalPT > 0 ? calculateOEE(totalOT, totalPT, totalProd, totalDef, m.idealSpeed) : { oee: 0, availability: 0, performance: 0, quality: 0 };
            return { machine: m, totalProd, totalDef, totalStop, ...comp, records: mp.length };
        }).filter(m => m.records > 0);

        setTrendData(trend);
        setSummaryRows(machSummary);
        setLoading(false);
    }, [fromDate, toDate, filterMachine, filterShift, machines]);

    useEffect(() => {
        if (machines.length > 0) runReport();
    }, [machines, runReport]);

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Reportes Analíticos</h1>
                <p>Análisis histórico de eficiencia y producción</p>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">🔍 Filtros de Análisis</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Desde</label>
                        <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Hasta</label>
                        <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Máquina</label>
                        <select className="form-control" value={filterMachine} onChange={e => setFilterMachine(e.target.value)}>
                            <option value="">Todas</option>
                            {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Turno</label>
                        <select className="form-control" value={filterShift} onChange={e => setFilterShift(e.target.value)}>
                            <option value="">Todos</option>
                            <option value="MORNING">Mañana</option>
                            <option value="AFTERNOON">Tarde</option>
                            <option value="NIGHT">Noche</option>
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={runReport} disabled={loading}>
                        {loading ? '⏳ Analizando...' : '🔍 Analizar'}
                    </button>
                </div>
            </div>

            {trendData.length > 0 && (
                <>
                    {/* OEE Trend */}
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-title">📈 Tendencia de Eficiencia</div>
                        <div className="chart-container-lg">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                                    <XAxis dataKey="date" tick={{ fill: '#4a6080', fontSize: 10 }} />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#4a6080', fontSize: 10 }} />
                                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 11 }} />
                                    <Legend wrapperStyle={{ fontSize: 11, color: '#8899b4' }} />
                                    <Line type="monotone" dataKey="OEE" stroke="#00d4ff" strokeWidth={2.5} dot={false} />
                                    <Line type="monotone" dataKey="Disponibilidad" stroke="#00e68a" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                                    <Line type="monotone" dataKey="Rendimiento" stroke="#ffb800" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                                    <Line type="monotone" dataKey="Calidad" stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Production trend */}
                    <div className="grid-2">
                        <div className="card">
                            <div className="card-title">🏭 Producción Diaria</div>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                                        <XAxis dataKey="date" tick={{ fill: '#4a6080', fontSize: 10 }} />
                                        <YAxis tick={{ fill: '#4a6080', fontSize: 10 }} />
                                        <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 11 }} />
                                        <Bar dataKey="Producción" fill="#00d4ff" radius={[3, 3, 0, 0]} />
                                        <Bar dataKey="Defectos" fill="#ff4757" radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Summary table */}
                        <div className="card">
                            <div className="card-title">📊 Resumen por Máquina</div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Máquina</th>
                                        <th>Registros</th>
                                        <th>Producción</th>
                                        <th>Defectos</th>
                                        <th>OEE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryRows.map((r: any) => (
                                        <tr key={r.machine.id}>
                                            <td style={{ fontWeight: 500, fontSize: 12 }}>{r.machine.name}</td>
                                            <td>{r.records}</td>
                                            <td>{r.totalProd.toLocaleString()}</td>
                                            <td style={{ color: r.totalDef > 0 ? '#ff4757' : '#00e68a' }}>{r.totalDef}</td>
                                            <td><strong style={{ color: getOEEColor(r.oee) }}>{(r.oee * 100).toFixed(1)}%</strong></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {!loading && trendData.length === 0 && (
                <div className="card empty-state">
                    <div className="icon">📊</div>
                    <h3>Sin datos para el período seleccionado</h3>
                    <p>Cambia los filtros y presiona Analizar.</p>
                </div>
            )}
        </div>
    );
}

