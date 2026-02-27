import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../services/api";
import "../styles/DashboardPage.css";
<<<<<<< Updated upstream

const formatValue = (val) => {
    if (val === null || val === undefined) return "0.0";
    const num = parseFloat(val);
    return isNaN(num) ? val : num.toFixed(1);
};
=======
>>>>>>> Stashed changes

function DashboardPage() {
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState(null);
    const [hourly, setHourly] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [dash, trend] = await Promise.all([
                api.get("/dashboard"),
                api.get("/dashboard/hourly").catch(() => [])
            ]);
            setDashboard(dash);
            setHourly(trend);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const timer = setInterval(fetchData, 10000);
        return () => clearInterval(timer);
    }, [fetchData]);

    const stats = dashboard ? [
        { icon: "⚡", label: "Total Campus Power", value: `${dashboard.totalPower || 0}W`, change: `${dashboard.activeDevices} devices`, changeType: "neutral", color: "blue" },
        { icon: "🏫", label: "Active Classrooms", value: `${dashboard.activeRooms}`, change: "rooms", changeType: "neutral", color: "purple" },
        { icon: "🔋", label: "Energy Today", value: `${formatValue(dashboard.energyToday)} kWh`, change: "today", changeType: "neutral", color: "green" },
        { icon: "💰", label: "Today's Cost", value: `₹${formatValue(dashboard.costToday)}`, change: "savings", changeType: "down", color: "emerald" },
        { icon: "🌿", label: "CO₂ Emissions", value: `${formatValue(dashboard.co2Today)} kg`, change: "today", changeType: "down", color: "teal" },
        { icon: "🚨", label: "Anomalies", value: `${dashboard.anomaliesToday}`, change: "today", changeType: dashboard.anomaliesToday > 0 ? "up" : "down", color: "red" },
    ] : [];

    const recentAlerts = dashboard?.alerts || [];
    const hourlyData = hourly.length > 0 ? hourly.map(h => h.avgPower) : Array(24).fill(0);
    const maxPower = Math.max(...hourlyData, 1);

    /* Build SVG path strings */
    const points = hourlyData.map((v, i) => `${i * 20},${200 - (v / maxPower) * 190}`);
    const linePath = `M ${points.join(" L ")}`;
    const areaPath = `${linePath} L ${(hourlyData.length - 1) * 20},200 L 0,200 Z`;

    const timeAgo = (dateStr) => {
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const getSeverityIcon = (alert) => {
        if (alert.severity === "CRITICAL" || alert.severity === "HIGH") return "🔴";
        if (alert.severity === "MEDIUM" || alert.alertType === "ANOMALY") return "🟡";
        return "🟢";
    };

    const changeArrow = (type) => type === "down" ? "↓" : type === "up" ? "↑" : "●";

    /* ── Loading skeleton ── */
    if (loading && !dashboard) {
        return (
            <Layout>
                <div className="page">
                    <div className="page__header">
                        <div>
                            <h1 className="page__title">Dashboard</h1>
                            <p className="page__subtitle">⟳ Fetching real-time data...</p>
                        </div>
                    </div>
                    <div className="stats-grid stats-grid--6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="stat-card stat-card--blue skeleton-card">
                                <div className="stat-card__value skeleton">—</div>
                                <div className="stat-card__label">Loading...</div>
                            </div>
                        ))}
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page">

                {/* ── Page Header ── */}
                <div className="page__header">
                    <div>
                        <h1 className="page__title">Dashboard</h1>
                        <p className="page__subtitle">Real-time campus energy overview — Control Center</p>
                    </div>
                    <div className="page__actions">
                        <button className="btn btn--outline">
                            <span>📥</span> Export Report
                        </button>
                        <button className="btn btn--primary" onClick={fetchData}>
                            <span>🔄</span> Refresh
                        </button>
                    </div>
                </div>

                {/* ── Stats Grid ── */}
                <div className="stats-grid stats-grid--6">
                    {stats.map((stat, i) => (
                        <div key={i} className={`stat-card stat-card--${stat.color}`}>
                            <div className="stat-card__header">
                                <span className="stat-card__icon">{stat.icon}</span>
                                <span className={`stat-card__change stat-card__change--${stat.changeType}`}>
                                    {changeArrow(stat.changeType)} {stat.change}
                                </span>
                            </div>
                            <div className="stat-card__value">{stat.value}</div>
                            <div className="stat-card__label">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* ── Main Content Grid ── */}
                <div className="content-grid content-grid--2-1">

                    {/* Live Power Chart */}
                    <div className="card">
                        <div className="card__header">
                            <h3 className="card__title">Live Campus Power (24hr)</h3>
                            <div className="card__badge card__badge--live">
                                <span className="pulse-dot" /> Live
                            </div>
                        </div>
                        <div className="chart-area">
                            <div className="line-chart">
                                <div className="line-chart__y-axis">
                                    <span>{maxPower}W</span>
                                    <span>{Math.round(maxPower * 0.66)}W</span>
                                    <span>{Math.round(maxPower * 0.33)}W</span>
                                    <span>0W</span>
                                </div>
                                <div className="line-chart__container">
                                    <svg viewBox="0 0 480 200" className="line-chart__svg">
                                        <defs>
                                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#00ffb2" stopOpacity="0.25" />
                                                <stop offset="100%" stopColor="#00ffb2" stopOpacity="0" />
                                            </linearGradient>
                                            <filter id="chartGlow">
                                                <feGaussianBlur stdDeviation="2" result="blur" />
                                                <feMerge>
                                                    <feMergeNode in="blur" />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
                                            </filter>
                                        </defs>
                                        {/* Area fill */}
                                        <path d={areaPath} fill="url(#chartGrad)" />
                                        {/* Glow duplicate (blurred, thicker) */}
                                        <path
                                            d={linePath}
                                            fill="none"
                                            stroke="#00ffb2"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeOpacity="0.25"
                                        />
                                        {/* Main crisp line */}
                                        <path
                                            className="chart-line chart-glow"
                                            d={linePath}
                                            fill="none"
                                            stroke="#00ffb2"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        {/* Data point dots */}
                                        {hourlyData.map((v, i) => (
                                            (i % 4 === 0) && (
                                                <circle
                                                    key={i}
                                                    cx={i * 20}
                                                    cy={200 - (v / maxPower) * 190}
                                                    r="3"
                                                    fill="#00ffb2"
                                                    opacity="0.7"
                                                />
                                            )
                                        ))}
                                    </svg>
                                    <div className="line-chart__x-axis">
                                        {["00", "04", "08", "12", "16", "20", "24"].map(h => (
                                            <span key={h}>{h}:00</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Alerts Panel */}
                    <div className="card cursor-pointer" onClick={() => navigate('/alerts')}>
                        <div className="card__header">
                            <h3 className="card__title">Recent Alerts</h3>
                            <span className="card__count">{recentAlerts.length}</span>
                        </div>
                        <div className="alert-list">
                            {recentAlerts.length === 0 ? (
                                <div className="empty-state">
                                    <span className="empty-state__icon">✅</span>
                                    No alerts — system is healthy
                                </div>
                            ) : (
                                recentAlerts.slice(0, 5).map((alert, i) => (
                                    <div key={i} className={`alert-item alert-item--${alert.type}`}>
                                        <span className="alert-item__icon">{getSeverityIcon(alert)}</span>
                                        <div className="alert-item__content">
                                            <p className="alert-item__title">{alert.title}</p>
                                            <p className="alert-item__time">{alert.classroom} · {timeAgo(alert.time)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Bottom Summary Cards ── */}
                <div className="content-grid content-grid--1-1 mt-20">
                    <div className="card">
                        <div className="card__header">
                            <h3 className="card__title">📊 System Status</h3>
                        </div>
                        <div className="summary-grid">
                            <div className="summary-item">
                                <span className="summary-item__icon">📡</span>
                                <div>
                                    <p className="summary-item__label">Active Devices</p>
                                    <p className="summary-item__value">{dashboard?.activeDevices || 0} / {dashboard?.totalDevices || 0}</p>
                                </div>
                            </div>
                            <div className="summary-item">
                                <span className="summary-item__icon">💡</span>
                                <div>
                                    <p className="summary-item__label">Anomalies Today</p>
                                    <p className="summary-item__value">{dashboard?.anomaliesToday || 0} detected</p>
                                </div>
                            </div>
                            <div className="summary-item">
                                <span className="summary-item__icon">🔋</span>
                                <div>
                                    <p className="summary-item__label">Energy Today</p>
                                    <p className="summary-item__value">{dashboard ? `${formatValue(dashboard.energyToday)} kWh` : "0 kWh"}</p>
                                </div>
                            </div>
                            <div className="summary-item">
                                <span className="summary-item__icon">🌱</span>
                                <div>
                                    <p className="summary-item__label">Carbon Today</p>
                                    <p className="summary-item__value">{dashboard ? `${formatValue(dashboard.co2Today)} kg` : "0 kg"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card__header">
                            <h3 className="card__title">⚡ Quick Info</h3>
                        </div>
                        <div className="summary-grid">
                            <div className="summary-item">
                                <span className="summary-item__icon">⏰</span>
                                <div>
                                    <p className="summary-item__label">Last Update</p>
                                    <p className="summary-item__value">{new Date().toLocaleTimeString()}</p>
                                </div>
                            </div>
                            <div className="summary-item">
                                <span className="summary-item__icon">💰</span>
                                <div>
                                    <p className="summary-item__label">Cost Today</p>
                                    <p className="summary-item__value">{dashboard ? `₹${formatValue(dashboard.costToday)}` : "₹0"}</p>
                                </div>
                            </div>
                            <div className="summary-item">
                                <span className="summary-item__icon">🎯</span>
                                <div>
                                    <p className="summary-item__label">Alerts</p>
                                    <p className="summary-item__value">{recentAlerts.length} active</p>
                                </div>
                            </div>
                            <div className="summary-item">
                                <span className="summary-item__icon">🏫</span>
                                <div>
                                    <p className="summary-item__label">Active Rooms</p>
                                    <p className="summary-item__value">{dashboard?.activeRooms || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </Layout>
    );
}

export default DashboardPage;