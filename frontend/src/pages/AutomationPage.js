import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import "../styles/pages.css";

function AutomationPage() {
    const { user } = useAuth();
    const [statuses, setStatuses] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [turningOff, setTurningOff] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const [statusData, logData] = await Promise.all([
                api.get("/automation/status"),
                api.get("/automation/logs?limit=30")
            ]);
            setStatuses(statusData);
            setLogs(logData);
        } catch (err) {
            console.error("Automation fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const timer = setInterval(fetchData, 30000);
        return () => clearInterval(timer);
    }, [fetchData]);

    const handleTurnOff = async (classroomObjId, classroomId) => {
        if (!window.confirm(`Send turn-off command for ${classroomId}?`)) return;
        setTurningOff(classroomObjId);
        try {
            await api.post(`/automation/turnoff/${classroomObjId}`);
            fetchData();
        } catch (err) {
            console.error("Turn off error:", err);
        } finally {
            setTurningOff(null);
        }
    };

    const timeAgo = (dateStr) => {
        if (!dateStr) return "—";
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const wastingCount = statuses.filter(s => s.status === "wasting").length;
    const activeCount = statuses.filter(s => s.status === "active").length;
    const idleCount = statuses.filter(s => s.status === "idle").length;
    const totalAutoOffs = logs.filter(l => l.action === "AUTO_OFF").length;

    const getStatusConfig = (status) => {
        switch (status) {
            case "active":
                return { color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)", icon: "✅", label: "Class In Progress" };
            case "wasting":
                return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)", icon: "🔴", label: "No Class — Wasting Power" };
            case "idle":
            default:
                return { color: "#64748b", bg: "rgba(100, 116, 139, 0.1)", border: "rgba(100, 116, 139, 0.3)", icon: "⚫", label: "Idle / Off" };
        }
    };

    return (
        <Layout>
            <div className="page">
                {/* Header */}
                <div className="page__header">
                    <div>
                        <h1 className="page__title">Smart Automation</h1>
                        <p className="page__subtitle">Timetable-based classroom power control — auto turn off when no class</p>
                    </div>
                    <div className="page__actions">
                        <button className="btn btn--primary" onClick={fetchData}>
                            <span>🔄</span> Refresh
                        </button>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="stats-grid stats-grid--4">
                    <div className="stat-card stat-card--red">
                        <div className="stat-card__header"><span className="stat-card__icon">🔴</span></div>
                        <div className="stat-card__value">{wastingCount}</div>
                        <div className="stat-card__label">Wasting Power</div>
                    </div>
                    <div className="stat-card stat-card--green">
                        <div className="stat-card__header"><span className="stat-card__icon">✅</span></div>
                        <div className="stat-card__value">{activeCount}</div>
                        <div className="stat-card__label">Class Active</div>
                    </div>
                    <div className="stat-card stat-card--blue">
                        <div className="stat-card__header"><span className="stat-card__icon">⚫</span></div>
                        <div className="stat-card__value">{idleCount}</div>
                        <div className="stat-card__label">Idle / Off</div>
                    </div>
                    <div className="stat-card stat-card--purple">
                        <div className="stat-card__header"><span className="stat-card__icon">🔌</span></div>
                        <div className="stat-card__value">{totalAutoOffs}</div>
                        <div className="stat-card__label">Auto Turn-Offs</div>
                    </div>
                </div>

                {/* Classroom Schedule Status Cards */}
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card__header">
                        <h3 className="card__title">📅 Classroom Schedule Status</h3>
                        <div className="card__badge card__badge--live">
                            <span className="pulse-dot"></span> Live
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading automation status...</div>
                    ) : statuses.length === 0 ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No classrooms configured</div>
                    ) : (
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                            gap: "16px",
                            padding: "20px"
                        }}>
                            {/* Sort: wasting first, then active, then idle */}
                            {[...statuses]
                                .sort((a, b) => {
                                    const order = { wasting: 0, active: 1, idle: 2 };
                                    return (order[a.status] || 2) - (order[b.status] || 2);
                                })
                                .map(room => {
                                    const config = getStatusConfig(room.status);
                                    return (
                                        <div key={room.classroomId} style={{
                                            background: config.bg,
                                            border: `1px solid ${config.border}`,
                                            borderRadius: "12px",
                                            padding: "20px",
                                            transition: "transform 0.2s, box-shadow 0.2s",
                                        }}>
                                            {/* Header */}
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <span style={{ fontSize: "1.3rem" }}>{config.icon}</span>
                                                    <div>
                                                        <h4 style={{ margin: 0, color: "#e2e8f0", fontSize: "1.1rem", fontWeight: 600 }}>
                                                            {room.classroomId}
                                                        </h4>
                                                        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{room.name}</span>
                                                    </div>
                                                </div>
                                                <span style={{
                                                    fontSize: "0.7rem",
                                                    padding: "4px 10px",
                                                    borderRadius: "20px",
                                                    background: config.color + "22",
                                                    color: config.color,
                                                    fontWeight: 600,
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.5px"
                                                }}>
                                                    {config.label}
                                                </span>
                                            </div>

                                            {/* Power */}
                                            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "12px" }}>
                                                <span style={{ fontSize: "1.8rem", fontWeight: 700, color: config.color }}>
                                                    {room.currentPower}
                                                </span>
                                                <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>W</span>
                                            </div>

                                            {/* Schedule Info */}
                                            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "14px" }}>
                                                {room.activeClass ? (
                                                    <div>
                                                        <span style={{ color: "#10b981" }}>📗 {room.activeClass.subject || "Lecture"}</span>
                                                        {room.activeClass.faculty && <span> — {room.activeClass.faculty}</span>}
                                                        <div style={{ marginTop: "4px" }}>Ends at {room.activeClass.endTime}</div>
                                                    </div>
                                                ) : room.nextClass ? (
                                                    <div>
                                                        <span>📘 Next: {room.nextClass.subject || "Class"} at {room.nextClass.startTime}</span>
                                                    </div>
                                                ) : (
                                                    <span>📭 No classes scheduled today</span>
                                                )}
                                            </div>

                                            {/* Last Action */}
                                            {room.lastAction && (
                                                <div style={{
                                                    fontSize: "0.75rem",
                                                    color: "#64748b",
                                                    padding: "6px 10px",
                                                    background: "rgba(0,0,0,0.2)",
                                                    borderRadius: "6px",
                                                    marginBottom: "12px"
                                                }}>
                                                    🔌 Last action: {room.lastAction.action} — {timeAgo(room.lastAction.time)}
                                                </div>
                                            )}

                                            {/* Turn Off Button */}
                                            {room.status === "wasting" && user?.role === "admin" && (
                                                <button
                                                    className="btn btn--sm"
                                                    onClick={() => handleTurnOff(room.classroomObjId, room.classroomId)}
                                                    disabled={turningOff === room.classroomObjId}
                                                    style={{
                                                        width: "100%",
                                                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                                        color: "#fff",
                                                        border: "none",
                                                        padding: "10px",
                                                        borderRadius: "8px",
                                                        cursor: turningOff === room.classroomObjId ? "wait" : "pointer",
                                                        fontWeight: 600,
                                                        fontSize: "0.85rem",
                                                        transition: "opacity 0.2s",
                                                        opacity: turningOff === room.classroomObjId ? 0.6 : 1
                                                    }}
                                                >
                                                    {turningOff === room.classroomObjId ? "⏳ Sending..." : "🔌 Turn Off Systems"}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>

                {/* Automation Log */}
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card__header">
                        <h3 className="card__title">📋 Automation Log</h3>
                        <span className="card__count">{logs.length}</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.85rem"
                        }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.15)" }}>
                                    <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 500 }}>Classroom</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 500 }}>Action</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 500 }}>Reason</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 500 }}>Power</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 500 }}>Triggered By</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 500 }}>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                                            No automation actions yet — scheduler is monitoring classrooms
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log, i) => (
                                        <tr key={log._id || i} style={{
                                            borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
                                            transition: "background 0.2s"
                                        }}>
                                            <td style={{ padding: "12px 16px", color: "#e2e8f0", fontWeight: 500 }}>
                                                {log.classroomId?.classroomId || log.classroomId?.name || "—"}
                                            </td>
                                            <td style={{ padding: "12px 16px" }}>
                                                <span style={{
                                                    padding: "3px 8px",
                                                    borderRadius: "6px",
                                                    fontSize: "0.75rem",
                                                    fontWeight: 600,
                                                    background: log.action === "AUTO_OFF"
                                                        ? "rgba(239, 68, 68, 0.15)" : log.action === "MANUAL_OFF"
                                                            ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)",
                                                    color: log.action === "AUTO_OFF"
                                                        ? "#ef4444" : log.action === "MANUAL_OFF"
                                                            ? "#f59e0b" : "#3b82f6"
                                                }}>
                                                    {log.action === "AUTO_OFF" ? "🤖 Auto Off" : log.action === "MANUAL_OFF" ? "👤 Manual Off" : "❄️ Pre-Cool"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 16px", color: "#94a3b8", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {log.reason}
                                            </td>
                                            <td style={{ padding: "12px 16px", color: "#e2e8f0", fontWeight: 500 }}>
                                                {log.powerAtTime}W
                                            </td>
                                            <td style={{ padding: "12px 16px", color: "#94a3b8" }}>
                                                {log.triggeredBy === "scheduler" ? "⏰ Scheduler" : "👤 Admin"}
                                            </td>
                                            <td style={{ padding: "12px 16px", color: "#64748b" }}>
                                                {timeAgo(log.createdAt)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default AutomationPage;
