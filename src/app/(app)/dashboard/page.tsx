'use client';
import { useState, useEffect } from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { formatCurrency, getOEEColor } from '../../../lib/oee';

interface DashboardData {
    globalOEE: number;
    globalAvailability: number;
    globalPerformance: number;
    globalQuality: number;
    oeeGoal: number;
    totalLosses: number;
    totalStoppageLoss: number;
    totalProductionLoss: number;
    totalDefectLoss: number;
    trendData: Array<{ date: string; oee: number; availability: number; performance: number; quality: number }>;
    topStopReasons: Array<{ reason: string; duration: number }>;
    machineRanking: Array<{ rank: number; id: string; name: string; area: string; oee: number; availability: number; performance: number; quality: number; totalLoss: number }>;
    totalMachines: number;
    criticalMachines: number;
}

function OEEGauge({ value, goal, label, color }: { value: number; goal: number; label: string; color: string }) {
    const pct = Math.min(100, Math.max(0, value));
    const radius = 54;
    const circ = 2 * Math.PI * radius;
    const strokeDash = (pct / 100) * circ * 0.75;
    const strokeDasharray = `${strokeDash} ${circ}`;
    const rotation = -135;

    return (
        <div style={{ textAlign: 'center', position: 'relative' }}>
            <svg width="140" height="100" viewBox="0 0 140 110">
                <circle cx="70" cy="75" r={radius} fill="none" stroke="#1e2d45" strokeWidth="10"
                    strokeDasharray={`${circ * 0.75} ${circ}`}
                    strokeLinecap="round"
                    transform={`rotate(${rotation} 70 75)`} />
                <circle cx="70" cy="75" r={radius} fill="none" stroke={color} strokeWidth="10"
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                    transform={`rotate(${rotation} 70 75)`}
                    style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${color})` }}
                />
                <text x="70" y="72" textAnchor="middle" fill={color} fontSize="22" fontWeight="800" fontFamily="Inter">{value.toFixed(1)}%</text>
                <text x="70" y="88" textAnchor="middle" fill="#4a6080" fontSize="10" fontFamily="Inter">Meta: {goal.toFixed(0)}%</text>
            </svg>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8899b4', textTransform: 'uppercase', letterSpacing: '1px', marginTop: -4 }}>{label}</div>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
            <div style={{ color: '#8899b4', marginBottom: 4 }}>{label}</div>
            {payload.map((p: any) => (
                <div key={p.name} style={{ color: p.color, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ color: '#8899b4' }}>{p.name}:</span>
                    <strong style={{ color: '#e8eef7' }}>{p.value}%</strong>
                </div>
            ))}
        </div>
    );
};

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="loading-center">
            <div className="spinner" />
            <span>Cargando dashboard...</span>
        </div>
    );

    if (!data) return <div className="alert alert-danger">Error al cargar el dashboard.</div>;

    const lossData = [
        { name: 'Paradas', value: data.totalStoppageLoss || 0, color: '#ff4757' },
        { name: 'Baja Producción', value: data.totalProductionLoss || 0, color: '#ffb800' },
        { name: 'Defectos', value: data.totalDefectLoss || 0, color: '#00d4ff' },
    ];

    const getBadgeClass = (oee: number) => {
        if (oee >= 85) return 'badge-excellent';
        if (oee >= 70) return 'badge-good';
        if (oee >= 50) return 'badge-acceptable';
        return 'badge-poor';
    };

    const getBadgeLabel = (oee: number) => {
        if (oee >= 85) return 'Excelente';
        if (oee >= 70) return 'Bueno';
        if (oee >= 50) return 'Aceptable';
        return 'Crítico';
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Dashboard OEE</h1>
                <p>Eficiencia global de producción — últimos 30 días</p>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">📊 Indicadores Globales de Eficiencia</div>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <OEEGauge value={data.globalOEE || 0} goal={data.oeeGoal || 85} label="OEE Global" color={getOEEColor((data.globalOEE || 0) / 100)} />
                    <div style={{ width: 1, height: 80, background: '#1e2d45' }} />
                    <OEEGauge value={data.globalAvailability || 0} goal={data.oeeGoal || 85} label="Disponibilidad" color="#00d4ff" />
                    <OEEGauge value={data.globalPerformance || 0} goal={data.oeeGoal || 85} label="Rendimiento" color="#ffb800" />
                    <OEEGauge value={data.globalQuality || 0} goal={data.oeeGoal || 85} label="Calidad" color="#00e68a" />
                    <div style={{ width: 1, height: 80, background: '#1e2d45' }} />
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#4a6080', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Resumen</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,71,87,0.08)', padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,71,87,0.2)' }}>
                                <span style={{ fontSize: 20 }}>🚨</span>
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#ff4757' }}>{data.criticalMachines || 0}</div>
                                    <div style={{ fontSize: 10, color: '#8899b4' }}>Máquinas críticas</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,230,138,0.08)', padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(0,230,138,0.2)' }}>
                                <span style={{ fontSize: 20 }}>⚙️</span>
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#00e68a' }}>{data.totalMachines || 0}</div>
                                    <div style={{ fontSize: 10, color: '#8899b4' }}>Máquinas activas</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-3-2">
                <div className="card">
                    <div className="card-title">📈 Tendencia OEE — Últimos 14 días</div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.trendData || []} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                                <XAxis dataKey="date" tick={{ fill: '#4a6080', fontSize: 10 }} tickFormatter={d => d?.slice(5) || ''} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#4a6080', fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 11, color: '#8899b4' }} />
                                <Line type="monotone" dataKey="oee" name="OEE" stroke="#00d4ff" strokeWidth={2.5} dot={false} />
                                <Line type="monotone" dataKey="availability" name="Disponibilidad" stroke="#00e68a" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                                <Line type="monotone" dataKey="performance" name="Rendimiento" stroke="#ffb800" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                                <Line type="monotone" dataKey="quality" name="Calidad" stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <div className="card-title">💰 Pérdidas Económicas</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#ff4757', marginBottom: 4 }}>
                        {formatCurrency(data.totalLosses || 0)}
                    </div>
                    <div style={{ fontSize: 12, color: '#8899b4', marginBottom: 16 }}>Pérdida total acumulada (30 días)</div>

                    <div style={{ height: 130 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={lossData} cx="50%" cy="50%" innerRadius={36} outerRadius={55} dataKey="value" paddingAngle={2}>
                                    {lossData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {lossData.map((item) => (
                        <div key={item.name} className="metric-row">
                            <div className="metric-label">
                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: item.color, marginRight: 6 }} />
                                {item.name}
                            </div>
                            <div className="metric-value">{formatCurrency(item.value)}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-title">⛔ Top Causas de Parada (min)</div>
                    <div className="chart-container" style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.topStopReasons || []} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
                                <XAxis type="number" tick={{ fill: '#4a6080', fontSize: 10 }} />
                                <YAxis type="category" dataKey="reason" width={130} tick={{ fill: '#8899b4', fontSize: 10 }} />
                                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [`${v} min`, 'Duración']} />
                                <Bar dataKey="duration" fill="#ff4757" radius={[0, 4, 4, 0]}>
                                    {data.topStopReasons?.map((_, i) => (
                                        <Cell key={i} fill={`rgba(255,71,87,${1 - i * 0.12})`} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <div className="card-title">🏆 Ranking de Máquinas</div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Rk</th>
                                <th>Máquina</th>
                                <th>OEE</th>
                                <th>Estado</th>
                                <th>Pérdida</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.machineRanking?.map(m => (
                                <tr key={m.id}>
                                    <td>
                                        <div className={`rank-badge rank-${m.rank <= 3 ? m.rank : 'other'}`}>{m.rank}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{m.name}</div>
                                        <div style={{ fontSize: 11, color: '#4a6080' }}>{m.area}</div>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 700, color: getOEEColor(m.oee / 100) }}>{m.oee}%</span>
                                    </td>
                                    <td>
                                        <span className={`badge ${getBadgeClass(m.oee)}`}>{getBadgeLabel(m.oee)}</span>
                                    </td>
                                    <td style={{ color: '#ff4757', fontSize: 12 }}>{formatCurrency(m.totalLoss)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

}
