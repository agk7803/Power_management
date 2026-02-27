import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import "../styles/pages.css";

function AlertsPage() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterSeverity, setFilterSeverity] = useState("all");

    const fetchAlerts = useCallback(async () => {
        try {
            const data = await api.get("/alerts");
            setAlerts(data);
        } catch (err) {
            console.error("Alerts fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

    const handleAcknowledge = async (id) => {
        try {
            await api.put(`/alerts/${id}/acknowledge`);
            setAlerts(prev => prev.map(a => a._id === id ? { ...a, acknowledged: true } : a));
        } catch (err) {
            console.error("Acknowledge error:", err);
        }
    };

    const filteredAlerts = alerts.filter(a => {
        if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
        return true;
    });

    const alertCounts = {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === "CRITICAL").length,
        high: alerts.filter(a => a.severity === "HIGH").length,
        medium: alerts.filter(a => a.severity === "MEDIUM").length,
        low: alerts.filter(a => a.severity === "LOW").length,
    };

    const timeAgo = (dateStr) => {
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const getSeverityClass = (severity) => {
        if (severity === "CRITICAL" || severity === "HIGH") return "critical";
        if (severity === "MEDIUM") return "warning";
        return "info";
    };

    return (
        <Layout>
            <div className="page">
                <div className="page__header">
                    <div>
                        <h1 className="page__title">Alerts</h1>
                        <p className="page__subtitle">Real-time monitoring alerts and notifications</p>
                    </div>
                    <div className="page__actions">
                        <button className="btn btn--primary" onClick={fetchAlerts}>
                            <span>🔄</span> Refresh
                        </button>
                    </div>
                </div>

                {/* Alert Summary */}
                <div className="stats-grid stats-grid--4">
                    <div className="stat-card stat-card--blue">
                        <div className="stat-card__header"><span className="stat-card__icon">🔔</span></div>
                        <div className="stat-card__value">{alertCounts.total}</div>
                        <div className="stat-card__label">Total Alerts</div>
                    </div>
                    <div className="stat-card stat-card--red">
                        <div className="stat-card__header"><span className="stat-card__icon">🔴</span></div>
                        <div className="stat-card__value">{alertCounts.critical}</div>
                        <div className="stat-card__label">Critical</div>
                    </div>
                    <div className="stat-card stat-card--orange">
                        <div className="stat-card__header"><span className="stat-card__icon">🟡</span></div>
                        <div className="stat-card__value">{alertCounts.high + alertCounts.medium}</div>
                        <div className="stat-card__label">Warnings</div>
                    </div>
                    <div className="stat-card stat-card--green">
                        <div className="stat-card__header"><span className="stat-card__icon">🟢</span></div>
                        <div className="stat-card__value">{alertCounts.low}</div>
                        <div className="stat-card__label">Low</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="filter-bar">
                    <div className="filter-group">
                        <label className="filter-label">Severity</label>
                        <select className="select-input" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
                            <option value="all">All</option>
                            <option value="CRITICAL">Critical</option>
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <span className="filter-count">{filteredAlerts.length} results</span>
                    </div>
                </div>

                {/* Alert List */}
                <div className="alerts-container">
                    {loading ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading alerts...</div>
                    ) : filteredAlerts.length === 0 ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                            No alerts found — system is healthy! ✅
                        </div>
                    ) : (
                        filteredAlerts.map(alert => (
                            <div key={alert._id} className={`alert-card alert-card--${getSeverityClass(alert.severity)}`}>
                                <div className="alert-card__indicator"></div>
                                <div className="alert-card__content">
                                    <div className="alert-card__header">
                                        <div className="alert-card__left">
                                            <span className={`severity-badge severity-badge--${getSeverityClass(alert.severity)}`}>
                                                {alert.severity}
                                            </span>
                                            <span className="alert-card__room">{alert.type}</span>
                                        </div>
                                        <span className="alert-card__time">{timeAgo(alert.createdAt)}</span>
                                    </div>
                                    <h4 className="alert-card__title">{alert.message}</h4>
                                    <p className="alert-card__desc">
                                        Classroom: {alert.classroomId ? (typeof alert.classroomId === 'object' ? (alert.classroomId.name || alert.classroomId.classroomId) : alert.classroomId) : "—"} · Type: {alert.type}
                                    </p>
                                    <div className="alert-card__actions">
                                        {!alert.acknowledged ? (
                                            <button
                                                className="btn btn--sm btn--primary"
                                                onClick={() => handleAcknowledge(alert._id)}
                                            >
                                                Acknowledge
                                            </button>
                                        ) : (
                                            <span className="tag tag--green">✓ Acknowledged</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Layout>
    );
}

export default AlertsPage;
