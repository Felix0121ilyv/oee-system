'use client';
import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { calculateOEE, calculateEconomicLosses, formatCurrency, getOEEColor } from '../../../lib/oee';

interface Machine { id: string; name: string; area: string; idealSpeed: number; plannedTime: number; }
interface ProductionRecord { id: string; machineId: string; totalProduction: number; defects: number; operativeTime: number; date: string; }
interface Stoppage { id: string; machineId: string; duration: number; type: string; date: string; }
interface Config { stopCostPerMin: number; defectCostPerUnit: number; productionValuePerUnit: number; oeeGoal: number; }

interface MachineLoss {
    machine: Machine;
    stoppageLoss: number;
    productionLoss: number;
    defectLoss: number;
    totalLoss: number;
    potentialGain: number;
    oee: number;
}

export default function LossesPage() {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [production, setProduction] = useState<ProductionRecord[]>([]);
    const [stoppages, setStoppages] = useState<Stoppage[]>([]);
    const [config, setConfig] = useState<Config | null>(null);
    const [loading, setLoading] = useState(true);

    const fetch30Days = useCallback(async () => {
        const from = new Date(); from.setDate(from.getDate() - 30);
        const fromStr = from.toISOString().split('T')[0];
        const [m, p, s, c] = await Promise.all([
            fetch('/api/machines').then(r => r.json()),
            fetch(`/api/production?from=${fromStr}`).then(r => r.json()),
            fetch(`/api/stoppages?from=${fromStr}`).then(r => r.json()),
            fetch('/api/config').then(r => r.json()),
        ]);
        setMachines(m); setProduction(p); setStoppages(s); setConfig(c); setLoading(false);
    }, []);

    useEffect(() => { fetch30Days(); }, [fetch30Days]);

    if (loading || !config) return <div className="loading-center"><div className="spinner" /><span>Calculando pérdidas...</span></div>;

    const machineLosses: MachineLoss[] = machines.map(machine => {
        const prods = production.filter(p => p.machineId === machine.id);
        const stops = stoppages.filter(s => s.machineId === machine.id);

        const totalOT = prods.reduce((s, p) => s + p.operativeTime, 0);
        const totalPT = prods.length * machine.plannedTime;
        const totalProd = prods.reduce((s, p) => s + p.totalProduction, 0);
        const totalDefects = prods.reduce((s, p) => s + p.defects, 0);
        const totalStopDur = stops.reduce((s, s2) => s + s2.duration, 0);

        const oeeComp = totalPT > 0 ? calculateOEE(totalOT, totalPT, totalProd, totalDefects, machine.idealSpeed) : { oee: 0 };
        const losses = calculateEconomicLosses(
            totalStopDur, totalDefects, totalProd, totalPT, machine.idealSpeed,
            config.stopCostPerMin, config.defectCostPerUnit, config.productionValuePerUnit, config.oeeGoal
        );

        return { machine, ...losses, oee: oeeComp.oee };
    });

    const totalLoss = machineLosses.reduce((s, m) => s + m.totalLoss, 0);
    const totalGain = machineLosses.reduce((s, m) => s + m.potentialGain, 0);
    const totalStopLoss = machineLosses.reduce((s, m) => s + m.stoppageLoss, 0);
    const totalProdLoss = machineLosses.reduce((s, m) => s + m.productionLoss, 0);
    const totalDefLoss = machineLosses.reduce((s, m) => s + m.defectLoss, 0);

    const lossTypeData = [
        { name: 'Paradas', value: totalStopLoss, color: '#ff4757' },
        { name: 'Baja Producción', value: totalProdLoss, color: '#ffb800' },
        { name: 'Defectos', value: totalDefLoss, color: '#00d4ff' },
    ];

    const machineBarData = machineLosses.sort((a, b) => b.totalLoss - a.totalLoss).map(m => ({
        name: m.machine.name.split(' - ')[0],
        paradas: Math.round(m.stoppageLoss),
        produccion: Math.round(m.productionLoss),
        defectos: Math.round(m.defectLoss),
        total: Math.round(m.totalLoss),
    }));

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Evaluación Económica de Pérdidas</h1>
                <p>Análisis financiero de ineficiencias — últimos 30 días</p>
            </div>

            {/* Summary KPIs */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
                <div className="kpi-card" style={{ '--kpi-color': '#ff4757' } as any}>
                    <div className="kpi-icon">💸</div>
                    <div className="kpi-label">Pérdida Total</div>
                    <div className="kpi-value">{formatCurrency(totalLoss)}</div>
                    <div className="kpi-sub">Acumulado 30 días</div>
                </div>
                <div className="kpi-card" style={{ '--kpi-color': '#ff4757' } as any}>
                    <div className="kpi-icon">⛔</div>
                    <div className="kpi-label">Por Paradas</div>
                    <div className="kpi-value">{formatCurrency(totalStopLoss)}</div>
                    <div className="kpi-sub">{totalLoss > 0 ? ((totalStopLoss / totalLoss) * 100).toFixed(0) : 0}% del total</div>
                </div>
                <div className="kpi-card" style={{ '--kpi-color': '#ffb800' } as any}>
                    <div className="kpi-icon">📉</div>
                    <div className="kpi-label">Por Baja Producción</div>
                    <div className="kpi-value">{formatCurrency(totalProdLoss)}</div>
                    <div className="kpi-sub">{totalLoss > 0 ? ((totalProdLoss / totalLoss) * 100).toFixed(0) : 0}% del total</div>
                </div>
                <div className="kpi-card gain-card" style={{ '--kpi-color': '#00e68a' } as any}>
                    <div className="kpi-icon">🎯</div>
                    <div className="kpi-label">Ganancia Potencial</div>
                    <div className="kpi-value">{formatCurrency(totalGain)}</div>
                    <div className="kpi-sub">Alcanzando meta OEE {(config.oeeGoal * 100).toFixed(0)}%</div>
                </div>
            </div>

            <div className="grid-3-2">
                {/* Stacked bar per machine */}
                <div className="card">
                    <div className="card-title">🏭 Pérdidas por Máquina</div>
                    <div className="chart-container-lg">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={machineBarData} margin={{ top: 5, right: 10, bottom: 40, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                                <XAxis dataKey="name" tick={{ fill: '#8899b4', fontSize: 10 }} angle={-25} textAnchor="end" />
                                <YAxis tick={{ fill: '#4a6080', fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => formatCurrency(v)} />
                                <Bar dataKey="paradas" name="Paradas" stackId="a" fill="#ff4757" />
                                <Bar dataKey="produccion" name="Baja Prod." stackId="a" fill="#ffb800" />
                                <Bar dataKey="defectos" name="Defectos" stackId="a" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Breakdown */}
                <div className="card">
                    <div className="card-title">📊 Distribución de Pérdidas</div>
                    <div style={{ height: 180, marginBottom: 16 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={lossTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                                    {lossTypeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {lossTypeData.map(item => (
                        <div key={item.name} className="metric-row">
                            <div className="metric-label">
                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: item.color, marginRight: 8 }} />
                                {item.name}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className="metric-value">{formatCurrency(item.value)}</div>
                                <div style={{ fontSize: 10, color: '#4a6080' }}>{totalLoss > 0 ? ((item.value / totalLoss) * 100).toFixed(1) : 0}%</div>
                            </div>
                        </div>
                    ))}

                    <div className="divider" />
                    <div style={{ background: 'rgba(0,230,138,0.06)', border: '1px solid rgba(0,230,138,0.2)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#4a6080', marginBottom: 4 }}>🎯 Si alcanzas meta OEE {(config.oeeGoal * 100).toFixed(0)}%</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#00e68a' }}>+{formatCurrency(totalGain)}</div>
                        <div style={{ fontSize: 11, color: '#4a6080' }}>ganancia adicional mensual estimada</div>
                    </div>
                </div>
            </div>

            {/* Per-machine table */}
            <div className="card">
                <div className="card-title">📋 Detalle por Máquina</div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Máquina</th>
                            <th>OEE</th>
                            <th>Pérd. Paradas</th>
                            <th>Pérd. Producción</th>
                            <th>Pérd. Defectos</th>
                            <th>Total Pérdidas</th>
                            <th>Ganancia Potencial</th>
                        </tr>
                    </thead>
                    <tbody>
                        {machineLosses.sort((a, b) => b.totalLoss - a.totalLoss).map(m => (
                            <tr key={m.machine.id}>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{m.machine.name}</div>
                                    <div style={{ fontSize: 11, color: '#4a6080' }}>{m.machine.area}</div>
                                </td>
                                <td><strong style={{ color: getOEEColor(m.oee) }}>{(m.oee * 100).toFixed(1)}%</strong></td>
                                <td style={{ color: '#ff4757' }}>{formatCurrency(m.stoppageLoss)}</td>
                                <td style={{ color: '#ffb800' }}>{formatCurrency(m.productionLoss)}</td>
                                <td style={{ color: '#00d4ff' }}>{formatCurrency(m.defectLoss)}</td>
                                <td><strong style={{ color: '#ff4757' }}>{formatCurrency(m.totalLoss)}</strong></td>
                                <td><strong style={{ color: '#00e68a' }}>{formatCurrency(m.potentialGain)}</strong></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

