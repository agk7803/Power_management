import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import "../styles/pages.css";

function AIInsightsPage() {
    const [alerts, setAlerts] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get("/alerts").catch(() => []),
            api.get("/dashboard").catch(() => null)
        ]).then(([alertData, dash]) => {
            setAlerts(Array.isArray(alertData) ? alertData : []);
            setDashboard(dash);
        }).finally(() => setLoading(false));
    }, []);

    // Derive AI insights from alerts and anomalies
    const anomalyAlerts = alerts.filter(a => a.type === "ANOMALY");
    const idleAlerts = alerts.filter(a => a.type === "IDLE");
    const criticalAlerts = alerts.filter(a => a.severity === "CRITICAL" || a.severity === "HIGH");

    // Compute patterns
    const hourDistribution = {};
    alerts.forEach(a => {
        const hour = new Date(a.createdAt).getHours();
        hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    });
    const peakAlertHour = Object.entries(hourDistribution).sort((a, b) => b[1] - a[1])[0];

    // Optimization recommendations based on real data
    const recommendations = [];
    if (idleAlerts.length > 0) {
        recommendations.push({
            icon: "💤",
            title: "Idle Equipment Detected",
            desc: `${idleAlerts.length} idle detection alerts. Consider auto-shutoff timers for unoccupied rooms.`,
            impact: "High",
            savings: `~${(idleAlerts.length * 0.5).toFixed(1)} kWh/day`,
        });
    }
    if (anomalyAlerts.length > 0) {
        recommendations.push({
            icon: "📊",
            title: "Anomalous Consumption Patterns",
            desc: `${anomalyAlerts.length} anomaly alerts detected. Investigate unusual power spikes.`,
            impact: "Medium",
            savings: `~${(anomalyAlerts.length * 0.3).toFixed(1)} kWh/day`,
        });
    }
    if (peakAlertHour) {
        recommendations.push({
            icon: "⏰",
            title: `Peak Alert Hour: ${peakAlertHour[0]}:00`,
            desc: `Most alerts occur at ${peakAlertHour[0]}:00 (${peakAlertHour[1]} alerts). Schedule maintenance outside this window.`,
            impact: "Low",
            savings: "Operational efficiency",
        });
    }
    if (dashboard?.activeDevices < dashboard?.totalDevices) {
        recommendations.push({
            icon: "📡",
            title: "Offline Devices",
            desc: `${dashboard.totalDevices - dashboard.activeDevices} devices are offline. Check connectivity.`,
            impact: "Medium",
            savings: "Data coverage",
        });
    }
    if (recommendations.length === 0) {
        recommendations.push({
            icon: "✅",
            title: "System Running Optimally",
            desc: "No significant optimization opportunities detected at this time.",
            impact: "—",
            savings: "—",
        });
    }

    const timeAgo = (dateStr) => {
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <Layout>
            <div className="page">
                <div className="page__header">
                    <div>
                        <h1 className="page__title">AI Insights</h1>
                        <p className="page__subtitle">Intelligent analysis and optimization recommendations</p>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Analyzing patterns...</div>
                ) : (
                    <>
                        {/* Summary Stats */}
                        <div className="stats-grid stats-grid--4">
                            <div className="stat-card stat-card--purple">
                                <div className="stat-card__header"><span className="stat-card__icon">🧠</span></div>
                                <div className="stat-card__value">{recommendations.length}</div>
                                <div className="stat-card__label">Recommendations</div>
                            </div>
                            <div className="stat-card stat-card--red">
                                <div className="stat-card__header"><span className="stat-card__icon">🔴</span></div>
                                <div className="stat-card__value">{anomalyAlerts.length}</div>
                                <div className="stat-card__label">Anomalies Detected</div>
                            </div>
                            <div className="stat-card stat-card--orange">
                                <div className="stat-card__header"><span className="stat-card__icon">💤</span></div>
                                <div className="stat-card__value">{idleAlerts.length}</div>
                                <div className="stat-card__label">Idle Alerts</div>
                            </div>
                            <div className="stat-card stat-card--blue">
                                <div className="stat-card__header"><span className="stat-card__icon">⚠️</span></div>
                                <div className="stat-card__value">{criticalAlerts.length}</div>
                                <div className="stat-card__label">Critical Issues</div>
                            </div>
                        </div>

                        {/* Recommendations */}
                        <div className="card" style={{ marginTop: 20 }}>
                            <div className="card__header">
                                <h3 className="card__title">🤖 AI-Generated Recommendations</h3>
                            </div>
                            <div className="recommendations-list">
                                {recommendations.map((rec, i) => (
                                    <div key={i} className="recommendation-card">
                                        <div className="recommendation-card__icon">{rec.icon}</div>
                                        <div className="recommendation-card__content">
                                            <h4 className="recommendation-card__title">{rec.title}</h4>
                                            <p className="recommendation-card__desc">{rec.desc}</p>
                                            <div className="recommendation-card__meta">
                                                <span className={`tag tag--${rec.impact === "High" ? "red" : rec.impact === "Medium" ? "orange" : "blue"}`}>
                                                    Impact: {rec.impact}
                                                </span>
                                                <span className="tag tag--green">Savings: {rec.savings}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Anomalies */}
                        <div className="card" style={{ marginTop: 20 }}>
                            <div className="card__header">
                                <h3 className="card__title">📡 Recent Anomaly Alerts</h3>
                                <span className="card__count">{anomalyAlerts.length}</span>
                            </div>
                            <div className="alert-list">
                                {anomalyAlerts.length === 0 ? (
                                    <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                                        No anomalies detected — system is running normally ✅
                                    </div>
                                ) : (
                                    anomalyAlerts.slice(0, 10).map((alert, i) => (
                                        <div key={i} className={`alert-item alert-item--${alert.severity === "CRITICAL" ? "warning" : "info"}`}>
                                            <span className="alert-item__icon">{alert.severity === "CRITICAL" ? "🔴" : "🟡"}</span>
                                            <div className="alert-item__content">
                                                <p className="alert-item__title">{alert.message}</p>
                                                <p className="alert-item__time">{timeAgo(alert.createdAt)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}

export default AIInsightsPage;
