import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import "../styles/pages.css";

function AnalyticsPage() {
    // ── Date Filters ──
    const getLocalYYYYMMDD = (d) => d.toLocaleDateString('en-CA');
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return getLocalYYYYMMDD(d);
    });
    const [toDate, setToDate] = useState(() => getLocalYYYYMMDD(new Date()));
    const [classrooms, setClassrooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState("");

    // ── Data States ──
    const [trends, setTrends] = useState(null);
    const [peak, setPeak] = useState(null);
    const [anomalies, setAnomalies] = useState(null);
    const [idle, setIdle] = useState(null);
    const [compare, setCompare] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState("trends"); // for mobile nav

    // ── Fetch Classrooms ──
    useEffect(() => {
        api.get("/classrooms").then(rooms => {
            setClassrooms(Array.isArray(rooms) ? rooms : []);
        }).catch(() => setClassrooms([]));
    }, []);

    // ── Fetch All Analytics ──
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const qs = `?from=${fromDate}&to=${toDate}${selectedRoom ? `&classroomId=${selectedRoom}` : ""}`;
        try {
            const [t, p, a, i, c] = await Promise.all([
                api.get(`/analytics/trends${qs}`).catch(() => null),
                api.get(`/analytics/peak${qs}`).catch(() => null),
                api.get(`/analytics/anomalies${qs}`).catch(() => null),
                api.get(`/analytics/idle${qs}`).catch(() => null),
                api.get(`/analytics/compare${qs}`).catch(() => null)
            ]);
            setTrends(t);
            setPeak(p);
            setAnomalies(a);
            setIdle(i);
            setCompare(c);
        } catch { /* ignore */ }
        setLoading(false);
    }, [fromDate, toDate, selectedRoom]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Quick Presets ──
    const setPreset = (days) => {
        const to = new Date().toLocaleDateString('en-CA');
        const fromDateObj = new Date();
        fromDateObj.setDate(fromDateObj.getDate() - days);
        const from = fromDateObj.toLocaleDateString('en-CA');
        setFromDate(from);
        setToDate(to);
    };

    // ── Chart Helpers ──
    const fmtTime = (ts) => new Date(ts).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

    // SVG line chart builder
    const buildLinePath = (data, maxVal, width = 460, height = 170) => {
        if (!data || data.length === 0) return { line: "", area: "" };
        const step = width / Math.max(data.length - 1, 1);
        const pts = data.map((v, i) => `${i * step},${height - (v / (maxVal || 1)) * height}`);
        return {
            line: `M ${pts.join(" L ")}`,
            area: `M ${pts.join(" L ")} L ${width},${height} L 0,${height} Z`
        };
    };

    // SVG bar chart builder
    const buildBars = (data, maxVal, width = 460, height = 170) => {
        if (!data || data.length === 0) return [];
        const gap = 4;
        const barW = Math.max((width / data.length) - gap, 4);
        return data.map((v, i) => ({
            x: i * (barW + gap),
            y: height - (v / (maxVal || 1)) * height,
            w: barW,
            h: (v / (maxVal || 1)) * height,
            val: v
        }));
    };

    // ── Section navigation tabs ──
    const sections = [
        { id: "trends", icon: "🔥", label: "Trends" },
        { id: "peak", icon: "⚡", label: "Peak Load" },
        { id: "anomalies", icon: "🧠", label: "Anomalies" },
        { id: "idle", icon: "🏫", label: "Idle Waste" },
    ];

    return (
        <Layout>
            <div className="page">
                {/* ── Header ── */}
                <div className="page__header">
                    <div>
                        <h1 className="page__title">📊 Advanced Analytics</h1>
                        <p className="page__subtitle">Deep-dive into energy consumption, peaks, anomalies, and idle waste</p>
                    </div>
                </div>

                <div className="analytics-filter-bar">
                    <div className="analytics-filter-bar__dates">
                        <select className="select-input" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                            <option value="">All Classrooms</option>
                            {classrooms.map(r => (
                                <option key={r._id} value={r._id}>{r.classroomId} — {r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="analytics-filter-bar__presets">
                        <button className="btn btn--sm btn--outline" onClick={() => setPreset(0)}>Today</button>
                        <button className="btn btn--sm btn--outline" onClick={() => setPreset(7)}>Last 7 Days</button>
                        <button className="btn btn--sm btn--outline" onClick={() => setPreset(30)}>Last 30 Days</button>
                    </div>
                </div>

                {/* ── Section Tabs ── */}
                <div className="toggle-group" style={{ marginBottom: 24 }}>
                    {sections.map(s => (
                        <button
                            key={s.id}
                            className={`toggle-btn ${activeSection === s.id ? "toggle-btn--active" : ""}`}
                            onClick={() => setActiveSection(s.id)}
                        >
                            {s.icon} {s.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading analytics...</div>
                ) : (
                    <>
                        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                            SECTION 1: Energy Consumption Trends
                        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                        {activeSection === "trends" && trends && (
                            <div className="analytics-section">
                                <h2 className="analytics-section__title">🔥 Energy Consumption Trends</h2>

                                {/* Top Stats */}
                                <div className="stats-grid stats-grid--4">
                                    <div className="stat-card stat-card--blue">
                                        <div className="stat-card__header"><span className="stat-card__icon">⚡</span></div>
                                        <div className="stat-card__value">{trends.totals.energy.toFixed(2)} kWh</div>
                                        <div className="stat-card__label">Total Energy</div>
                                    </div>
                                    <div className="stat-card stat-card--green">
                                        <div className="stat-card__header"><span className="stat-card__icon">💰</span></div>
                                        <div className="stat-card__value">₹{trends.totals.cost.toFixed(2)}</div>
                                        <div className="stat-card__label">Total Cost</div>
                                    </div>
                                    <div className="stat-card stat-card--emerald">
                                        <div className="stat-card__header"><span className="stat-card__icon">🌿</span></div>
                                        <div className="stat-card__value">{trends.totals.co2.toFixed(3)} kg</div>
                                        <div className="stat-card__label">CO₂ Emissions</div>
                                    </div>
                                    <div className="stat-card stat-card--purple">
                                        <div className="stat-card__header"><span className="stat-card__icon">📊</span></div>
                                        <div className="stat-card__value">{trends.totals.count}</div>
                                        <div className="stat-card__label">Data Points</div>
                                    </div>
                                </div>

                                <div className="content-grid content-grid--1-1">
                                    {/* Hourly Power Trend */}
                                    <div className="card">
                                        <div className="card__header">
                                            <h3 className="card__title">Hourly Power Trend (Avg W)</h3>
                                        </div>
                                        <div className="chart-area">
                                            {(() => {
                                                const vals = trends.hourly.map(h => h.avgPower);
                                                const max = Math.max(...vals, 1);
                                                const { line, area } = buildLinePath(vals, max);
                                                const peakHourSet = new Set(trends.peakHours.map(p => p.hour));
                                                return (
                                                    <div className="line-chart">
                                                        <div className="line-chart__container">
                                                            <svg viewBox="0 0 460 170" className="line-chart__svg">
                                                                <defs>
                                                                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                                                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                                                                    </linearGradient>
                                                                </defs>
                                                                <path d={area} fill="url(#trendGrad)" />
                                                                <path d={line} fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
                                                                {/* Peak hour markers */}
                                                                {vals.map((v, i) => peakHourSet.has(i) ? (
                                                                    <circle key={i} cx={i * (460 / 23)} cy={170 - (v / max) * 170} r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
                                                                ) : null)}
                                                            </svg>
                                                            <div className="line-chart__x-axis">
                                                                {["00", "06", "12", "18", "23"].map(h => <span key={h}>{h}:00</span>)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        {trends.peakHours.length > 0 && (
                                            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                <span style={{ fontSize: 12, color: "#94a3b8" }}>🔝 Peak Hours:</span>
                                                {trends.peakHours.map(p => (
                                                    <span key={p.hour} className="tag tag--yellow">{p.hour}:00 — {p.avgPower}W</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Today vs Yesterday */}
                                    <div className="card">
                                        <div className="card__header">
                                            <h3 className="card__title">Today vs Yesterday</h3>
                                        </div>
                                        <div className="chart-area">
                                            {(() => {
                                                const t = trends.today;
                                                const y = trends.yesterday;
                                                const maxE = Math.max(t.energy || 0, y.energy || 0, 0.01);
                                                return (
                                                    <div className="comparison-bars">
                                                        {[
                                                            { label: "Energy", todayVal: t.energy?.toFixed(2) || "0", yestVal: y.energy?.toFixed(2) || "0", unit: "kWh", tPct: (t.energy / maxE) * 100, yPct: (y.energy / maxE) * 100, color1: "#3b82f6", color2: "#60a5fa" },
                                                            { label: "Cost", todayVal: `₹${(t.cost || 0).toFixed(2)}`, yestVal: `₹${(y.cost || 0).toFixed(2)}`, unit: "", tPct: Math.max(t.cost, y.cost) > 0 ? (t.cost / Math.max(t.cost, y.cost)) * 100 : 0, yPct: Math.max(t.cost, y.cost) > 0 ? (y.cost / Math.max(t.cost, y.cost)) * 100 : 0, color1: "#22c55e", color2: "#4ade80" },
                                                            { label: "CO₂", todayVal: `${(t.co2 || 0).toFixed(3)}`, yestVal: `${(y.co2 || 0).toFixed(3)}`, unit: "kg", tPct: Math.max(t.co2, y.co2) > 0 ? (t.co2 / Math.max(t.co2, y.co2)) * 100 : 0, yPct: Math.max(t.co2, y.co2) > 0 ? (y.co2 / Math.max(t.co2, y.co2)) * 100 : 0, color1: "#14b8a6", color2: "#2dd4bf" }
                                                        ].map(item => (
                                                            <div key={item.label} className="comparison-row">
                                                                <div className="comparison-row__label">{item.label}</div>
                                                                <div className="comparison-row__bars">
                                                                    <div className="comparison-row__bar-group">
                                                                        <span className="comparison-row__tag">Today</span>
                                                                        <div className="comparison-row__track">
                                                                            <div className="comparison-row__fill" style={{ width: `${Math.min(item.tPct, 100)}%`, background: item.color1 }}></div>
                                                                        </div>
                                                                        <span className="comparison-row__val">{item.todayVal} {item.unit}</span>
                                                                    </div>
                                                                    <div className="comparison-row__bar-group">
                                                                        <span className="comparison-row__tag">Yesterday</span>
                                                                        <div className="comparison-row__track">
                                                                            <div className="comparison-row__fill" style={{ width: `${Math.min(item.yPct, 100)}%`, background: item.color2, opacity: 0.6 }}></div>
                                                                        </div>
                                                                        <span className="comparison-row__val">{item.yestVal} {item.unit}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Week Comparison + Weekday vs Weekend */}
                                {compare && (
                                    <div className="content-grid content-grid--1-1" style={{ marginTop: 20 }}>
                                        <div className="card">
                                            <div className="card__header">
                                                <h3 className="card__title">This Week vs Last Week</h3>
                                            </div>
                                            <div className="summary-grid">
                                                {[
                                                    { label: "Energy", tw: `${compare.thisWeek.energy.toFixed(2)} kWh`, lw: `${compare.lastWeek.energy.toFixed(2)} kWh`, change: compare.change.energy, icon: "⚡" },
                                                    { label: "Cost", tw: `₹${compare.thisWeek.cost.toFixed(2)}`, lw: `₹${compare.lastWeek.cost.toFixed(2)}`, change: compare.change.cost, icon: "💰" },
                                                    { label: "CO₂", tw: `${compare.thisWeek.co2.toFixed(3)} kg`, lw: `${compare.lastWeek.co2.toFixed(3)} kg`, change: compare.change.co2, icon: "🌿" },
                                                ].map(item => (
                                                    <div key={item.label} className="summary-item">
                                                        <div className="summary-item__icon">{item.icon}</div>
                                                        <div style={{ flex: 1 }}>
                                                            <p className="summary-item__label">{item.label}</p>
                                                            <p className="summary-item__value">
                                                                {item.tw}
                                                                <span className={`stat-card__change ${item.change <= 0 ? "stat-card__change--down" : "stat-card__change--up"}`} style={{ marginLeft: 8 }}>
                                                                    {item.change > 0 ? "+" : ""}{item.change}%
                                                                </span>
                                                            </p>
                                                        </div>
                                                        <div style={{ textAlign: "right", fontSize: 12, color: "#64748b" }}>
                                                            Last: {item.lw}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="card">
                                            <div className="card__header">
                                                <h3 className="card__title">Weekday vs Weekend</h3>
                                            </div>
                                            <div className="summary-grid">
                                                <div className="summary-item">
                                                    <div className="summary-item__icon">🏢</div>
                                                    <div>
                                                        <p className="summary-item__label">Weekday Avg Power</p>
                                                        <p className="summary-item__value">{trends.weekdayWeekend.weekday?.avgPower || 0} W</p>
                                                    </div>
                                                    <div style={{ textAlign: "right" }}>
                                                        <p className="text-muted">Energy</p>
                                                        <p className="summary-item__value">{(trends.weekdayWeekend.weekday?.totalEnergy || 0).toFixed(2)} kWh</p>
                                                    </div>
                                                </div>
                                                <div className="summary-item">
                                                    <div className="summary-item__icon">🏖️</div>
                                                    <div>
                                                        <p className="summary-item__label">Weekend Avg Power</p>
                                                        <p className="summary-item__value">{trends.weekdayWeekend.weekend?.avgPower || 0} W</p>
                                                    </div>
                                                    <div style={{ textAlign: "right" }}>
                                                        <p className="text-muted">Energy</p>
                                                        <p className="summary-item__value">{(trends.weekdayWeekend.weekend?.totalEnergy || 0).toFixed(2)} kWh</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}

                        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                            SECTION 2: Peak Load & Demand Analysis
                        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                        {activeSection === "peak" && peak && (
                            <div className="analytics-section">
                                <h2 className="analytics-section__title">⚡ Peak Load & Demand Analysis</h2>

                                <div className="stats-grid stats-grid--4">
                                    <div className="stat-card stat-card--red">
                                        <div className="stat-card__header"><span className="stat-card__icon">🔺</span></div>
                                        <div className="stat-card__value">{peak.stats.maxPower} W</div>
                                        <div className="stat-card__label">Highest Power</div>
                                    </div>
                                    <div className="stat-card stat-card--blue">
                                        <div className="stat-card__header"><span className="stat-card__icon">📊</span></div>
                                        <div className="stat-card__value">{Math.round(peak.stats.avgPower)} W</div>
                                        <div className="stat-card__label">Average Load</div>
                                    </div>
                                    <div className="stat-card stat-card--orange">
                                        <div className="stat-card__header"><span className="stat-card__icon">📈</span></div>
                                        <div className="stat-card__value">{peak.stats.avgPower > 0 ? (peak.stats.maxPower / peak.stats.avgPower).toFixed(1) : "—"}x</div>
                                        <div className="stat-card__label">Peak-to-Avg Ratio</div>
                                    </div>
                                    <div className="stat-card stat-card--purple">
                                        <div className="stat-card__header"><span className="stat-card__icon">⏰</span></div>
                                        <div className="stat-card__value">{peak.peakReading ? fmtTime(peak.peakReading.time) : "—"}</div>
                                        <div className="stat-card__label">Peak Time ({peak.peakReading?.classroom || ""})</div>
                                    </div>
                                </div>

                                <div className="content-grid content-grid--1-1">
                                    {/* Peak Power Per Day */}
                                    <div className="card">
                                        <div className="card__header">
                                            <h3 className="card__title">Peak Power Per Day</h3>
                                        </div>
                                        <div className="chart-area">
                                            {(() => {
                                                const vals = peak.peakPerDay.map(d => d.peakPower);
                                                const avgVals = peak.peakPerDay.map(d => Math.round(d.avgPower));
                                                const max = Math.max(...vals, 1);
                                                const { line: peakLine } = buildLinePath(vals, max);
                                                const { line: avgLine } = buildLinePath(avgVals, max);
                                                return (
                                                    <div className="line-chart">
                                                        <div className="line-chart__container">
                                                            <svg viewBox="0 0 460 170" className="line-chart__svg">
                                                                <defs>
                                                                    <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                                                                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                                                                    </linearGradient>
                                                                </defs>
                                                                <path d={avgLine} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,3" />
                                                                <path d={peakLine} fill="none" stroke="#ef4444" strokeWidth="2.5" />
                                                            </svg>
                                                            <div style={{ display: "flex", gap: "1rem", padding: "0.5rem 0", fontSize: "0.75rem" }}>
                                                                <span style={{ color: "#ef4444" }}>● Peak</span>
                                                                <span style={{ color: "#3b82f6" }}>┄ Average</span>
                                                            </div>
                                                            <div className="line-chart__x-axis">
                                                                {peak.peakPerDay.length <= 7 ? peak.peakPerDay.map(d => (
                                                                    <span key={d._id}>{fmtDate(d._id)}</span>
                                                                )) : [peak.peakPerDay[0], peak.peakPerDay[peak.peakPerDay.length - 1]].map(d => (
                                                                    <span key={d._id}>{fmtDate(d._id)}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Load Distribution Histogram */}
                                    <div className="card">
                                        <div className="card__header">
                                            <h3 className="card__title">Load Distribution</h3>
                                        </div>
                                        <div className="chart-area">
                                            {peak.histogram && peak.histogram.length > 0 ? (() => {
                                                const maxCount = Math.max(...peak.histogram.map(h => h.count), 1);
                                                return (
                                                    <div className="bar-chart-h">
                                                        {peak.histogram.map((bucket, i) => (
                                                            <div key={i} className="bar-chart-h__item">
                                                                <div className="bar-chart-h__label">{bucket.rangeLabel}</div>
                                                                <div className="bar-chart-h__track">
                                                                    <div className="bar-chart-h__fill" style={{ width: `${(bucket.count / maxCount) * 100}%` }}></div>
                                                                </div>
                                                                <div className="bar-chart-h__value">{bucket.count}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })() : <div className="text-muted">No data</div>}
                                        </div>
                                    </div>
                                </div>

                                {/* Top 10 Highest Readings */}
                                {peak.top10 && peak.top10.length > 0 && (
                                    <div className="card" style={{ marginTop: 20 }}>
                                        <div className="card__header">
                                            <h3 className="card__title">🏆 Top 10 Highest Power Readings</h3>
                                        </div>
                                        <div className="table-wrapper">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Classroom</th>
                                                        <th>Power</th>
                                                        <th>Voltage</th>
                                                        <th>Current</th>
                                                        <th>Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {peak.top10.map((r, i) => (
                                                        <tr key={i}>
                                                            <td style={{ fontWeight: 700, color: i < 3 ? "#f59e0b" : "#94a3b8" }}>{i + 1}</td>
                                                            <td><span className="tag tag--blue">{r.classroomCode}</span> {r.classroom}</td>
                                                            <td className="text-red">{r.power} W</td>
                                                            <td>{r.voltage} V</td>
                                                            <td>{r.current} A</td>
                                                            <td className="text-muted">{fmtTime(r.time)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                            SECTION 3: AI Anomaly Detection
                        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                        {activeSection === "anomalies" && anomalies && (
                            <div className="analytics-section">
                                <h2 className="analytics-section__title">🧠 AI-Based Anomaly Detection</h2>

                                <div className="stats-grid stats-grid--4">
                                    <div className="stat-card stat-card--red">
                                        <div className="stat-card__header"><span className="stat-card__icon">🚨</span></div>
                                        <div className="stat-card__value">{anomalies.stats.totalAnomalies}</div>
                                        <div className="stat-card__label">Total Anomalies</div>
                                    </div>
                                    <div className="stat-card stat-card--orange">
                                        <div className="stat-card__header"><span className="stat-card__icon">📊</span></div>
                                        <div className="stat-card__value">{(anomalies.stats.avgAnomalyScore || 0).toFixed(2)}</div>
                                        <div className="stat-card__label">Avg Anomaly Score</div>
                                    </div>
                                    <div className="stat-card stat-card--purple">
                                        <div className="stat-card__header"><span className="stat-card__icon">🏆</span></div>
                                        <div className="stat-card__value">{(anomalies.stats.maxAnomalyScore || 0).toFixed(2)}</div>
                                        <div className="stat-card__label">Max Anomaly Score</div>
                                    </div>
                                    <div className="stat-card stat-card--blue">
                                        <div className="stat-card__header"><span className="stat-card__icon">📈</span></div>
                                        <div className="stat-card__value">{anomalies.stats.totalReadings > 0 ? ((anomalies.stats.totalAnomalies / anomalies.stats.totalReadings) * 100).toFixed(1) : 0}%</div>
                                        <div className="stat-card__label">Anomaly Rate</div>
                                    </div>
                                </div>

                                <div className="content-grid content-grid--1-1">
                                    {/* Anomalies Per Day */}
                                    <div className="card">
                                        <div className="card__header">
                                            <h3 className="card__title">Anomalies Per Day</h3>
                                        </div>
                                        <div className="chart-area">
                                            {anomalies.anomalyByDay.length > 0 ? (() => {
                                                const vals = anomalies.anomalyByDay.map(d => d.count);
                                                const max = Math.max(...vals, 1);
                                                const bars = buildBars(vals, max);
                                                return (
                                                    <div className="line-chart">
                                                        <div className="line-chart__container">
                                                            <svg viewBox="0 0 460 170" className="line-chart__svg">
                                                                {bars.map((b, i) => (
                                                                    <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="3" fill="#ef4444" opacity="0.75">
                                                                        <title>{anomalies.anomalyByDay[i]._id}: {b.val} anomalies</title>
                                                                    </rect>
                                                                ))}
                                                            </svg>
                                                            <div className="line-chart__x-axis">
                                                                {anomalies.anomalyByDay.length <= 7 ? anomalies.anomalyByDay.map(d => (
                                                                    <span key={d._id}>{fmtDate(d._id)}</span>
                                                                )) : [anomalies.anomalyByDay[0], anomalies.anomalyByDay[anomalies.anomalyByDay.length - 1]].map(d => (
                                                                    <span key={d._id}>{fmtDate(d._id)}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })() : <div className="text-muted" style={{ padding: 20 }}>No anomalies detected ✅</div>}
                                        </div>
                                    </div>

                                    {/* Top Anomalous Classrooms */}
                                    <div className="card">
                                        <div className="card__header">
                                            <h3 className="card__title">Top Anomalous Classrooms</h3>
                                        </div>
                                        {anomalies.topRooms.length > 0 ? (
                                            <div className="bar-chart-h">
                                                {anomalies.topRooms.map((room, i) => (
                                                    <div key={i} className="bar-chart-h__item">
                                                        <div className="bar-chart-h__label">
                                                            <span className="tag tag--red">{room.classroomCode}</span>
                                                        </div>
                                                        <div className="bar-chart-h__track">
                                                            <div className="bar-chart-h__fill bar-chart-h__fill--red"
                                                                style={{ width: `${(room.count / anomalies.topRooms[0].count) * 100}%` }}>
                                                            </div>
                                                        </div>
                                                        <div className="bar-chart-h__value">{room.count} anomalies</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <div className="text-muted" style={{ padding: 20 }}>No data</div>}
                                    </div>
                                </div>

                                {/* Root Cause Analysis */}
                                {anomalies.rootCauses && anomalies.rootCauses.length > 0 && (
                                    <div className="card" style={{ marginTop: 20 }}>
                                        <div className="card__header">
                                            <h3 className="card__title">🔍 Root Cause Analysis</h3>
                                            <span className="card__count">{anomalies.rootCauses.length} recent</span>
                                        </div>
                                        <div className="table-wrapper">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Classroom</th>
                                                        <th>Power</th>
                                                        <th>Score</th>
                                                        <th>Root Cause</th>
                                                        <th>Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {anomalies.rootCauses.map((r, i) => (
                                                        <tr key={i} className="anomaly-row">
                                                            <td><span className="tag tag--red">{r.classroomCode}</span> {r.classroomName}</td>
                                                            <td className="text-red">{r.power} W</td>
                                                            <td>
                                                                <span className={`tag ${r.score >= 3 ? "tag--red" : r.score >= 2 ? "tag--orange" : "tag--yellow"}`}>
                                                                    {r.score.toFixed(2)}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {r.causes.map((c, j) => (
                                                                    <div key={j} style={{ fontSize: 12, color: "#f87171", marginBottom: 2 }}>⚠️ {c}</div>
                                                                ))}
                                                            </td>
                                                            <td className="text-muted">{fmtTime(r.time)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                            SECTION 4: Idle Energy Detection
                        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                        {activeSection === "idle" && idle && (
                            <div className="analytics-section">
                                <h2 className="analytics-section__title">🏫 Idle Energy Detection</h2>

                                <div className="stats-grid stats-grid--4">
                                    <div className="stat-card stat-card--orange">
                                        <div className="stat-card__header"><span className="stat-card__icon">💤</span></div>
                                        <div className="stat-card__value">{idle.stats.idleEnergy.toFixed(2)} kWh</div>
                                        <div className="stat-card__label">Idle Energy Wasted</div>
                                    </div>
                                    <div className="stat-card stat-card--red">
                                        <div className="stat-card__header"><span className="stat-card__icon">💸</span></div>
                                        <div className="stat-card__value">₹{idle.stats.idleCost.toFixed(2)}</div>
                                        <div className="stat-card__label">Cost Wasted</div>
                                    </div>
                                    <div className="stat-card stat-card--purple">
                                        <div className="stat-card__header"><span className="stat-card__icon">⏱️</span></div>
                                        <div className="stat-card__value">{idle.stats.idleHours} hrs</div>
                                        <div className="stat-card__label">Idle Duration</div>
                                    </div>
                                    <div className="stat-card stat-card--teal">
                                        <div className="stat-card__header"><span className="stat-card__icon">📉</span></div>
                                        <div className="stat-card__value">{idle.stats.idlePercent}%</div>
                                        <div className="stat-card__label">Idle Rate</div>
                                    </div>
                                </div>

                                {/* Smart Waste Indicator */}
                                <div className="card analytics-smart-waste" style={{ marginBottom: 20 }}>
                                    <div className="card__header">
                                        <h3 className="card__title">🎯 Smart Waste Detection</h3>
                                        <span className="tag tag--red">AI Powered</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
                                        <div style={{ flex: 1, minWidth: 200 }}>
                                            <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 8px" }}>
                                                Detection Logic: <code style={{ color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 4 }}>occupancy = 0</code>
                                                {" AND "}
                                                <code style={{ color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 4 }}>power &gt; 50W</code>
                                                {" AND "}
                                                <code style={{ color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 4 }}>scheduledClass = false</code>
                                            </p>
                                        </div>
                                        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 0, flex: 1, minWidth: 300 }}>
                                            <div style={{ padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)" }}>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: "#ef4444" }}>{idle.smartWaste.wasteCount}</div>
                                                <div className="text-muted">Waste Events</div>
                                            </div>
                                            <div style={{ padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)" }}>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>{(idle.smartWaste.wasteEnergy || 0).toFixed(4)} kWh</div>
                                                <div className="text-muted">Wasted Energy</div>
                                            </div>
                                            <div style={{ padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)" }}>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: "#ef4444" }}>₹{(idle.smartWaste.wasteCost || 0).toFixed(2)}</div>
                                                <div className="text-muted">Wasted Cost</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="content-grid content-grid--1-1">
                                    {/* Idle Energy Per Day */}
                                    <div className="card">
                                        <div className="card__header">
                                            <h3 className="card__title">Idle Energy Per Day</h3>
                                        </div>
                                        <div className="chart-area">
                                            {idle.idleByDay.length > 0 ? (() => {
                                                const vals = idle.idleByDay.map(d => d.energy);
                                                const max = Math.max(...vals, 0.001);
                                                const bars = buildBars(vals, max);
                                                return (
                                                    <div className="line-chart">
                                                        <div className="line-chart__container">
                                                            <svg viewBox="0 0 460 170" className="line-chart__svg">
                                                                {bars.map((b, i) => (
                                                                    <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="3" fill="#f97316" opacity="0.75">
                                                                        <title>{idle.idleByDay[i]._id}: {b.val.toFixed(4)} kWh wasted</title>
                                                                    </rect>
                                                                ))}
                                                            </svg>
                                                            <div className="line-chart__x-axis">
                                                                {idle.idleByDay.length <= 7 ? idle.idleByDay.map(d => (
                                                                    <span key={d._id}>{fmtDate(d._id)}</span>
                                                                )) : [idle.idleByDay[0], idle.idleByDay[idle.idleByDay.length - 1]].map(d => (
                                                                    <span key={d._id}>{fmtDate(d._id)}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })() : <div className="text-muted" style={{ padding: 20 }}>No idle energy detected ✅</div>}
                                        </div>
                                    </div>

                                    {/* Idle vs Active Energy */}
                                    <div className="card">
                                        <div className="card__header">
                                            <h3 className="card__title">Idle vs Active Energy</h3>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 180 }}>
                                            <svg viewBox="0 0 200 200" width="180" height="180">
                                                {(() => {
                                                    const idlePct = idle.stats.idlePercent || 0;
                                                    const r = 80;
                                                    const cx = 100, cy = 100;
                                                    const idleAngle = (idlePct / 100) * 360;
                                                    const toRad = a => (a - 90) * Math.PI / 180;
                                                    const largeArc = idleAngle > 180 ? 1 : 0;
                                                    const x1 = cx + r * Math.cos(toRad(0));
                                                    const y1 = cy + r * Math.sin(toRad(0));
                                                    const x2 = cx + r * Math.cos(toRad(idleAngle));
                                                    const y2 = cy + r * Math.sin(toRad(idleAngle));
                                                    return (
                                                        <>
                                                            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="24" />
                                                            {idlePct > 0 && idlePct < 100 && (
                                                                <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`} fill="none" stroke="#f97316" strokeWidth="24" strokeLinecap="round" />
                                                            )}
                                                            {idlePct >= 100 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f97316" strokeWidth="24" />}
                                                            <text x={cx} y={cy - 8} textAnchor="middle" fill="#f1f5f9" fontSize="22" fontWeight="700">{idlePct}%</text>
                                                            <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize="11">Idle</text>
                                                        </>
                                                    );
                                                })()}
                                            </svg>
                                            <div style={{ marginLeft: 20 }}>
                                                <div style={{ marginBottom: 12 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                        <span style={{ width: 12, height: 12, borderRadius: 3, background: "#f97316", display: "inline-block" }}></span>
                                                        <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>Idle: {idle.stats.idleEnergy.toFixed(2)} kWh</span>
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "#94a3b8" }}>₹{idle.stats.idleCost.toFixed(2)} wasted</div>
                                                </div>
                                                <div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                        <span style={{ width: 12, height: 12, borderRadius: 3, background: "#1e293b", display: "inline-block" }}></span>
                                                        <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>Active: {(idle.stats.totalEnergy - idle.stats.idleEnergy).toFixed(2)} kWh</span>
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "#94a3b8" }}>₹{(idle.stats.totalCost - idle.stats.idleCost).toFixed(2)} productive</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Top Idle Classrooms */}
                                {idle.topIdle && idle.topIdle.length > 0 && (
                                    <div className="card" style={{ marginTop: 20 }}>
                                        <div className="card__header">
                                            <h3 className="card__title">🏫 Top Idle Classrooms (Highest Waste)</h3>
                                            <span className="card__count">{idle.topIdle.length} rooms</span>
                                        </div>
                                        <div className="table-wrapper">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Classroom</th>
                                                        <th>Idle Energy</th>
                                                        <th>Cost Wasted</th>
                                                        <th>Idle Events</th>
                                                        <th>Avg Power (Idle)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {idle.topIdle.map((room, i) => (
                                                        <tr key={i}>
                                                            <td style={{ fontWeight: 700, color: i < 3 ? "#f97316" : "#94a3b8" }}>{i + 1}</td>
                                                            <td><span className="tag tag--orange">{room.classroomCode}</span> {room.classroomName}</td>
                                                            <td>{room.idleEnergy.toFixed(4)} kWh</td>
                                                            <td className="text-red">₹{room.idleCost.toFixed(2)}</td>
                                                            <td>{room.idleCount}</td>
                                                            <td>{room.avgPower} W</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}

export default AnalyticsPage;
