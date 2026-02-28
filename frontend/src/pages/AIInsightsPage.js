import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import "../styles/pages.css";
import "../styles/aiInsights.css";

/* ══════════════════════════════════════
   Tiny SVG chart helpers (no library)
   ══════════════════════════════════════ */

function Sparkline({ data, color = "#3b82f6", height = 60 }) {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const W = 400, H = height;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 8) - 4;
        return `${x},${y}`;
    });
    const path = `M ${pts.join(" L ")}`;
    const area = `M ${pts[0]} L ${pts.join(" L ")} L ${(data.length - 1) / (data.length - 1) * W},${H} L 0,${H} Z`;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height }} preserveAspectRatio="none">
            <defs>
                <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#sg-${color.replace("#", "")})`} />
            <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function DualLineChart({ data, height = 220 }) {
    /* data: [{label, actual, predicted}] */
    if (!data || data.length < 2) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>No data</div>;

    const valids = data.filter(d => d.actual !== null && d.actual !== undefined);
    const allVals = [
        ...data.map(d => d.predicted).filter(Boolean),
        ...valids.map(d => d.actual)
    ];
    const max = Math.max(...allVals, 1);
    const W = 1000, H = height;
    const pad = { top: 16, bottom: 36, left: 48, right: 16 };
    const innerW = W - pad.left - pad.right;
    const innerH = H - pad.top - pad.bottom;

    const xPos = (i) => pad.left + (i / (data.length - 1)) * innerW;
    const yPos = (v) => pad.top + innerH - (v / max) * innerH;

    const predPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xPos(i)} ${yPos(d.predicted)}`).join(" ");
    const actPts = data.filter(d => d.actual !== null && d.actual !== undefined);

    // Y gridlines
    const gridVals = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f));

    // X labels: show every 3 hours
    const xLabels = data.filter((_, i) => i % 3 === 0);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height }} aria-label="Forecast chart">
            {/* Grid lines */}
            {gridVals.map((v, i) => (
                <g key={i}>
                    <line x1={pad.left} y1={yPos(v)} x2={W - pad.right} y2={yPos(v)}
                        stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
                    <text x={pad.left - 6} y={yPos(v) + 4} fill="#64748b" fontSize="11" textAnchor="end">{v > 999 ? `${(v / 1000).toFixed(1)}k` : v}W</text>
                </g>
            ))}

            {/* Predicted line (dotted) */}
            <path d={predPath} fill="none" stroke="#8b5cf6" strokeWidth="2"
                strokeDasharray="6 3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Actual line (solid) */}
            {actPts.length > 1 && (() => {
                const actPath = actPts.map((d, i) => {
                    const idx = data.indexOf(d);
                    return `${i === 0 ? "M" : "L"} ${xPos(idx)} ${yPos(d.actual)}`;
                }).join(" ");
                return <path d={actPath} fill="none" stroke="#22c55e" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" />;
            })()}

            {/* Actual dots */}
            {actPts.map((d) => {
                const idx = data.indexOf(d);
                return <circle key={idx} cx={xPos(idx)} cy={yPos(d.actual)} r="3"
                    fill="#22c55e" stroke="#0f172a" strokeWidth="1.5" />;
            })}

            {/* X axis labels */}
            {xLabels.map((d, i) => {
                const idx = data.indexOf(d);
                return <text key={i} x={xPos(idx)} y={H - 6} fill="#64748b" fontSize="11" textAnchor="middle">{d.label}</text>;
            })}
        </svg>
    );
}

function BarChartVertical({ data, valueKey, labelKey, color = "#3b82f6", height = 180 }) {
    if (!data || !data.length) return null;
    const maxVal = Math.max(...data.map(d => d[valueKey]), 0.001);
    return (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, overflow: "hidden" }}>
            {data.map((d, i) => {
                const pct = (d[valueKey] / maxVal) * 100;
                return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                        <span style={{ fontSize: 9, color: "#64748b", writingMode: "horizontal-tb" }}>
                            {d[valueKey] > 999 ? `${(d[valueKey] / 1000).toFixed(1)}k` : d[valueKey]}
                        </span>
                        <div style={{
                            width: "100%",
                            height: `${Math.max(2, pct)}%`,
                            background: d.isWeekend
                                ? "rgba(100,116,139,0.3)"
                                : `linear-gradient(180deg, ${color}, ${color}99)`,
                            borderRadius: "4px 4px 0 0",
                            transition: "height 0.6s ease",
                            minHeight: 2
                        }} />
                        <span style={{ fontSize: 9, color: "#64748b", whiteSpace: "nowrap" }}>{d[labelKey]}</span>
                    </div>
                );
            })}
        </div>
    );
}

function GaugeRing({ score, grade }) {
    const pct = score / 100;
    const r = 54, cx = 70, cy = 70;
    const circ = 2 * Math.PI * r;
    const dash = circ * pct;
    const color = score >= 90 ? "#22c55e" : score >= 75 ? "#3b82f6" : score >= 60 ? "#f97316" : "#ef4444";
    return (
        <svg viewBox="0 0 140 140" width="140" height="140">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="12" />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="12"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dasharray 1s ease" }}
            />
            <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize="22" fontWeight="800">{score}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize="12">Grade {grade}</text>
        </svg>
    );
}

function FeatureBar({ feature, importance }) {
    const pct = (importance * 100).toFixed(1);
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "monospace" }}>{feature}</span>
                <span style={{ fontSize: 12, color: "var(--accent-purple)", fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, #8b5cf6, #3b82f6)",
                    borderRadius: 4,
                    transition: "width 0.8s ease"
                }} />
            </div>
        </div>
    );
}

/* ══════════════════════════════════════
   Main Page
   ══════════════════════════════════════ */

const TABS = [
    { id: "overview", label: "🧠 Overview" },
    { id: "forecast", label: "📈 Forecast" },
    { id: "efficiency", label: "⚡ Efficiency" }
];

function AIInsightsPage() {
    const [activeTab, setActiveTab] = useState("overview");
    const [alerts, setAlerts] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [efficiency, setEfficiency] = useState(null);
    const [loading, setLoading] = useState(true);
    const [forecastLoading, setForecastLoading] = useState(false);
    const [efficiencyLoading, setEfficiencyLoading] = useState(false);
    const [forecastView, setForecastView] = useState("today"); // "today" | "tomorrow"
    const [explainData, setExplainData] = useState(null);
    const [explainLoading, setExplainLoading] = useState(false);
    const [explainError, setExplainError] = useState(null);

    // ── Load overview data ──
    useEffect(() => {
        Promise.all([
            api.get("/alerts").catch(() => []),
            api.get("/dashboard").catch(() => null)
        ]).then(([alertData, dash]) => {
            setAlerts(Array.isArray(alertData) ? alertData : []);
            setDashboard(dash);
        }).finally(() => setLoading(false));
    }, []);

    // ── Lazy load forecast when tab selected ──
    const loadForecast = useCallback(() => {
        if (forecast || forecastLoading) return;
        setForecastLoading(true);
        api.get("/ai/forecast")
            .then(setForecast)
            .catch(console.error)
            .finally(() => setForecastLoading(false));
    }, [forecast, forecastLoading]);

    // ── Lazy load efficiency when tab selected ──
    const loadEfficiency = useCallback(() => {
        if (efficiency || efficiencyLoading) return;
        setEfficiencyLoading(true);
        api.get("/ai/efficiency")
            .then(setEfficiency)
            .catch(console.error)
            .finally(() => setEfficiencyLoading(false));
    }, [efficiency, efficiencyLoading]);

    const handleTab = (id) => {
        setActiveTab(id);
        if (id === "forecast") loadForecast();
        if (id === "efficiency") loadEfficiency();
    };

    // ── Load OpenRouter AI explanation (Llama 3 instruct) ──
    const loadExplainAI = useCallback(() => {
        if (explainLoading) return;
        setExplainLoading(true);
        setExplainError(null);
        api.post("/ai/explain", {})
            .then(data => setExplainData(data))
            .catch(err => setExplainError(err.message || "Failed to get AI explanation"))
            .finally(() => setExplainLoading(false));
    }, [explainLoading]);

    // ── Overview derived data ──
    const anomalyAlerts = alerts.filter(a => a.type === "ANOMALY");
    const idleAlerts = alerts.filter(a => a.type === "IDLE");
    const criticalAlerts = alerts.filter(a => a.severity === "CRITICAL" || a.severity === "HIGH");

    const hourDistribution = {};
    alerts.forEach(a => {
        const hour = new Date(a.createdAt).getHours();
        hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    });
    const peakAlertHour = Object.entries(hourDistribution).sort((a, b) => b[1] - a[1])[0];

    const recommendations = [];
    if (idleAlerts.length > 0) recommendations.push({ icon: "💤", title: "Idle Equipment Detected", desc: `${idleAlerts.length} idle detection alerts. Consider auto-shutoff timers for unoccupied rooms.`, impact: "High", savings: `~${(idleAlerts.length * 0.5).toFixed(1)} kWh/day` });
    if (anomalyAlerts.length > 0) recommendations.push({ icon: "📊", title: "Anomalous Consumption Patterns", desc: `${anomalyAlerts.length} anomaly alerts detected. Investigate unusual power spikes.`, impact: "Medium", savings: `~${(anomalyAlerts.length * 0.3).toFixed(1)} kWh/day` });
    if (peakAlertHour) recommendations.push({ icon: "⏰", title: `Peak Alert Hour: ${peakAlertHour[0]}:00`, desc: `Most alerts occur at ${peakAlertHour[0]}:00 (${peakAlertHour[1]} alerts). Schedule maintenance outside this window.`, impact: "Low", savings: "Operational efficiency" });
    if (recommendations.length === 0) recommendations.push({ icon: "✅", title: "System Running Optimally", desc: "No significant optimization opportunities detected at this time.", impact: "—", savings: "—" });

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
                        <p className="page__subtitle">Load forecasting, efficiency analysis & intelligent recommendations</p>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="ai-tabs">
                    {TABS.map(t => (
                        <button key={t.id}
                            className={`ai-tab-btn ${activeTab === t.id ? "ai-tab-btn--active" : ""}`}
                            onClick={() => handleTab(t.id)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ════════════════════ OVERVIEW TAB ════════════════════ */}
                {activeTab === "overview" && (
                    loading ? (
                        <div className="ai-loading">🧠 Analyzing patterns...</div>
                    ) : (
                        <>
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

                            {/* ── Explain AI Panel ── */}
                            <div className="card ai-explain-card" style={{ marginTop: 20 }}>
                                <div className="card__header">
                                    <h3 className="card__title">🤖 Explain with OpenRouter AI</h3>
                                    <button
                                        className={`ai-explain-btn ${explainLoading ? "ai-explain-btn--loading" : ""}`}
                                        onClick={loadExplainAI}
                                        disabled={explainLoading}
                                    >
                                        {explainLoading ? (
                                            <><span className="ai-explain-btn__spinner" /> Analyzing...</>
                                        ) : explainData ? (
                                            "🔄 Re-analyze"
                                        ) : (
                                            "✨ Explain with OpenRouter AI"
                                        )}
                                    </button>
                                </div>

                                {explainError && (
                                    <div className="ai-explain-error">
                                        ⚠️ {explainError}
                                    </div>
                                )}

                                {explainLoading && (
                                    <div className="ai-explain-skeleton">
                                        <div className="ai-explain-skeleton__bar ai-explain-skeleton__bar--w80" />
                                        <div className="ai-explain-skeleton__bar ai-explain-skeleton__bar--w60" />
                                        <div className="ai-explain-skeleton__bar ai-explain-skeleton__bar--w90" />
                                        <div className="ai-explain-skeleton__bar ai-explain-skeleton__bar--w50" />
                                        <div className="ai-explain-skeleton__bar ai-explain-skeleton__bar--w70" />
                                        <p style={{ textAlign: "center", color: "#8b5cf6", fontSize: 13, marginTop: 16 }}>
                                            OpenRouter AI (Llama 3) is analyzing anomaly patterns, cross-referencing timetables, and generating optimization advice...
                                        </p>
                                    </div>
                                )}

                                {!explainLoading && explainData && (
                                    <div className="ai-explain-results">
                                        {/* Overall Assessment */}
                                        {explainData.overallAssessment && (
                                            <div className="ai-explain-assessment">
                                                <span className="ai-explain-assessment__icon">📋</span>
                                                <p>{explainData.overallAssessment}</p>
                                            </div>
                                        )}

                                        {/* Anomaly Explanations */}
                                        {explainData.anomalyExplanations && explainData.anomalyExplanations.length > 0 && (
                                            <div className="ai-explain-section">
                                                <h4 className="ai-explain-section__title">🔍 Anomaly Explanations</h4>
                                                <div className="ai-explain-section__list">
                                                    {explainData.anomalyExplanations.map((exp, i) => (
                                                        <div key={i} className={`ai-anomaly-detail ai-anomaly-detail--${exp.anomalyType}`}>
                                                            <div className="ai-anomaly-detail__header">
                                                                <span className="ai-anomaly-detail__icon">{exp.icon || "📊"}</span>
                                                                <div>
                                                                    <h5 className="ai-anomaly-detail__title">{exp.title}</h5>
                                                                    <span className={`tag tag--${exp.anomalyType === "power_spike" ? "red" : exp.anomalyType === "occupancy_mismatch" ? "orange" : exp.anomalyType === "idle_waste" ? "blue" : "purple"}`}>
                                                                        {exp.anomalyType?.replace(/_/g, " ").toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <p className="ai-anomaly-detail__text">{exp.explanation}</p>
                                                            <div className="ai-anomaly-detail__meta">
                                                                <div className="ai-anomaly-detail__meta-item">
                                                                    <span className="ai-anomaly-detail__meta-label">Root Cause</span>
                                                                    <span className="ai-anomaly-detail__meta-value">{exp.rootCause}</span>
                                                                </div>
                                                                <div className="ai-anomaly-detail__meta-item">
                                                                    <span className="ai-anomaly-detail__meta-label">Severity Note</span>
                                                                    <span className="ai-anomaly-detail__meta-value">{exp.severityNote}</span>
                                                                </div>
                                                                {exp.affectedEquipment && exp.affectedEquipment.length > 0 && (
                                                                    <div className="ai-anomaly-detail__meta-item">
                                                                        <span className="ai-anomaly-detail__meta-label">Affected Equipment</span>
                                                                        <span className="ai-anomaly-detail__meta-value">
                                                                            {exp.affectedEquipment.map((eq, j) => (
                                                                                <span key={j} className="tag tag--gray" style={{ marginRight: 4, fontSize: 10 }}>{eq}</span>
                                                                            ))}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Optimization Suggestions */}
                                        {explainData.optimizationSuggestions && explainData.optimizationSuggestions.length > 0 && (
                                            <div className="ai-explain-section">
                                                <h4 className="ai-explain-section__title">💡 Energy Optimization Suggestions</h4>
                                                <div className="ai-explain-section__list">
                                                    {explainData.optimizationSuggestions.map((tip, i) => (
                                                        <div key={i} className="ai-optimization-tip">
                                                            <div className="ai-optimization-tip__header">
                                                                <span className="ai-optimization-tip__icon">{tip.icon || "💡"}</span>
                                                                <h5 className="ai-optimization-tip__title">{tip.title}</h5>
                                                                <span className={`tag tag--${tip.priority === "HIGH" ? "red" : tip.priority === "MEDIUM" ? "orange" : "blue"}`}>
                                                                    {tip.priority}
                                                                </span>
                                                            </div>
                                                            <p className="ai-optimization-tip__desc">{tip.description}</p>
                                                            {tip.estimatedSavings && (
                                                                <div className="ai-optimization-tip__savings">
                                                                    <span>💰 Estimated Savings:</span>
                                                                    <strong>{tip.estimatedSavings}</strong>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!explainLoading && !explainData && !explainError && (
                                    <div className="ai-explain-placeholder">
                                        <div className="ai-explain-placeholder__icon">✨</div>
                                        <p>Click <strong>"Explain with Gemini AI"</strong> to get a detailed analysis of current anomalies, root cause identification, and actionable energy optimization advice.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )
                )}

                {/* ════════════════════ FORECAST TAB ════════════════════ */}
                {activeTab === "forecast" && (
                    forecastLoading ? (
                        <div className="ai-loading">
                            <div className="ai-loading__spinner" />
                            <span>Running load forecasting model...</span>
                        </div>
                    ) : !forecast || forecast.serviceOffline ? (
                        <div className="ai-offline-banner">
                            <div className="ai-offline-banner__icon">🐍</div>
                            <div>
                                <div className="ai-offline-banner__title">XGBoost ML Service Offline</div>
                                <div className="ai-offline-banner__desc">The Python service that runs the trained model is not running. Start it with:</div>
                                <code className="ai-offline-banner__cmd">cd ml &amp;&amp; python serve_model.py</code>
                                {!forecast && <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>Make sure you've run <code>python train_forecast_model.py</code> first to generate the .pkl file.</div>}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Model performance stats */}
                            <div className="stats-grid stats-grid--4" style={{ marginTop: 0 }}>
                                <div className="stat-card stat-card--purple">
                                    <div className="stat-card__header">
                                        <span className="stat-card__icon">📐</span>
                                        <span className="tag tag--purple">MAE</span>
                                    </div>
                                    <div className="stat-card__value">{forecast.modelStats.mae}W</div>
                                    <div className="stat-card__label">Mean Absolute Error</div>
                                </div>
                                <div className="stat-card stat-card--blue">
                                    <div className="stat-card__header">
                                        <span className="stat-card__icon">📉</span>
                                        <span className="tag tag--blue">RMSE</span>
                                    </div>
                                    <div className="stat-card__value">{forecast.modelStats.rmse}W</div>
                                    <div className="stat-card__label">Root Mean Square Error</div>
                                </div>
                                <div className="stat-card stat-card--green">
                                    <div className="stat-card__header">
                                        <span className="stat-card__icon">🎯</span>
                                        <span className="tag tag--green">R²</span>
                                    </div>
                                    <div className="stat-card__value">{(forecast.modelStats.r2 * 100).toFixed(1)}%</div>
                                    <div className="stat-card__label">Model Accuracy (R²)</div>
                                </div>
                                <div className="stat-card stat-card--teal">
                                    <div className="stat-card__header">
                                        <span className="stat-card__icon">🗂️</span>
                                        <span className="tag tag--blue">DATA</span>
                                    </div>
                                    <div className="stat-card__value">{forecast.modelStats.trainSize.toLocaleString()}</div>
                                    <div className="stat-card__label">Training Samples</div>
                                </div>
                            </div>

                            {/* Model info banner */}
                            <div className="ai-model-badge">
                                <div className="ai-model-badge__icon">🤖</div>
                                <div>
                                    <div className="ai-model-badge__name">{forecast.modelStats.algorithm}</div>
                                    <div className="ai-model-badge__meta">
                                        {forecast.modelStats.nEstimators} estimators · LR {forecast.modelStats.learningRate} ·
                                        {forecast.modelStats.features} features · {forecast.modelStats.testSize.toLocaleString()} test samples
                                    </div>
                                </div>
                                <div className="ai-model-badge__r2">
                                    R² {(forecast.modelStats.r2 * 100).toFixed(1)}%
                                </div>
                            </div>

                            {/* Main chart */}
                            <div className="card" style={{ marginTop: 20 }}>
                                <div className="card__header">
                                    <h3 className="card__title">📈 Actual vs Predicted Load (15-min intervals)</h3>
                                    <div className="toggle-group">
                                        <button
                                            className={`toggle-btn ${forecastView === "today" ? "toggle-btn--active" : ""}`}
                                            onClick={() => setForecastView("today")}>Today</button>
                                        <button
                                            className={`toggle-btn ${forecastView === "tomorrow" ? "toggle-btn--active" : ""}`}
                                            onClick={() => setForecastView("tomorrow")}>Tomorrow</button>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="ai-chart-legend">
                                    <div className="ai-legend-item">
                                        <div className="ai-legend-line ai-legend-line--actual" />
                                        <span>Actual Power (W)</span>
                                    </div>
                                    <div className="ai-legend-item">
                                        <div className="ai-legend-line ai-legend-line--predicted" />
                                        <span>Predicted Power (W)</span>
                                    </div>
                                </div>

                                <div style={{ marginTop: 12, overflowX: "auto" }}>
                                    {forecastView === "today" ? (
                                        <DualLineChart data={forecast.forecast24h} height={240} />
                                    ) : (
                                        <>
                                            <div className="ai-tomorrow-note">
                                                ⚡ Tomorrow's forecast — actual readings not yet available
                                            </div>
                                            <DualLineChart
                                                data={forecast.forecastTomorrow.map(d => ({
                                                    ...d, actual: null
                                                }))}
                                                height={240}
                                            />
                                            {/* Confidence bands */}
                                            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                                                {forecast.forecastTomorrow.filter((_, i) => i % 6 === 0).map((d, i) => (
                                                    <div key={i} className="ai-confidence-chip">
                                                        {d.label} · {d.predicted}W · {d.confidence}% conf.
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Weekly forecast + Feature importance side by side */}
                            <div className="content-grid content-grid--1-1" style={{ marginTop: 20 }}>
                                {/* 7-day peak forecast */}
                                <div className="card">
                                    <div className="card__header">
                                        <h3 className="card__title">📅 7-Day Peak Load Forecast</h3>
                                        <span className="tag tag--blue">Next 7 days</span>
                                    </div>
                                    <BarChartVertical
                                        data={forecast.weeklyForecast}
                                        valueKey="peakPredicted"
                                        labelKey="dayLabel"
                                        color="#8b5cf6"
                                        height={180}
                                    />
                                    <div className="ai-weekly-table">
                                        {forecast.weeklyForecast.map((d, i) => (
                                            <div key={i} className={`ai-weekly-row ${d.isWeekend ? "ai-weekly-row--weekend" : ""}`}>
                                                <span className="ai-weekly-day">{d.dayLabel} <span style={{ color: "#64748b", fontSize: 11 }}>{d.date.slice(5)}</span></span>
                                                <span className="ai-weekly-peak">Peak: <b>{d.peakPredicted} kW</b></span>
                                                <span className="ai-weekly-avg">Avg: {d.avgPredicted} kW</span>
                                                {d.isWeekend && <span className="tag tag--gray">Weekend</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Feature Importance */}
                                <div className="card">
                                    <div className="card__header">
                                        <h3 className="card__title">🔍 Feature Importance</h3>
                                        <span className="tag tag--purple">XGBoost</span>
                                    </div>
                                    <p style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>
                                        Contribution of each feature to the model's predictions (matches Python XGBRegressor output).
                                    </p>
                                    {forecast.featureImportance.map((f, i) => (
                                        <FeatureBar key={i} feature={f.feature} importance={f.importance} />
                                    ))}
                                    <div className="ai-model-note">
                                        <span>💡</span> Direct output from the XGBRegressor .pkl model — lag features (recent history) dominate prediction of next 15-min load.
                                    </div>
                                </div>
                            </div>
                        </>
                    )
                )}

                {/* ════════════════════ EFFICIENCY TAB ════════════════════ */}
                {activeTab === "efficiency" && (
                    efficiencyLoading ? (
                        <div className="ai-loading">
                            <div className="ai-loading__spinner" />
                            <span>Running efficiency analysis...</span>
                        </div>
                    ) : !efficiency ? (
                        <div className="ai-loading">No efficiency data available</div>
                    ) : (
                        <>
                            {/* Overall efficiency score + key stats */}
                            <div className="ai-efficiency-hero">
                                <div className="ai-efficiency-hero__gauge">
                                    <GaugeRing score={efficiency.efficiency.score} grade={efficiency.efficiency.grade} />
                                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 8, textAlign: "center" }}>Campus Efficiency Score</div>
                                </div>
                                <div className="ai-efficiency-hero__stats">
                                    <div className="ai-eff-stat">
                                        <div className="ai-eff-stat__icon">⚡</div>
                                        <div>
                                            <div className="ai-eff-stat__label">Avg Power Factor</div>
                                            <div className="ai-eff-stat__value">{efficiency.powerFactor.avg.toFixed(3)}</div>
                                            <div className={`ai-eff-stat__sub ${efficiency.powerFactor.avg >= 0.85 ? "ai-eff-stat__sub--good" : "ai-eff-stat__sub--bad"}`}>
                                                {efficiency.powerFactor.avg >= 0.85 ? "✅ Above threshold" : "⚠️ Below 0.85 threshold"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ai-eff-stat">
                                        <div className="ai-eff-stat__icon">🔌</div>
                                        <div>
                                            <div className="ai-eff-stat__label">Low PF Occurrence</div>
                                            <div className="ai-eff-stat__value">{efficiency.powerFactor.lowPercent.toFixed(1)}%</div>
                                            <div className="ai-eff-stat__sub">{efficiency.powerFactor.low.toLocaleString()} readings below {efficiency.powerFactor.threshold}</div>
                                        </div>
                                    </div>
                                    <div className="ai-eff-stat">
                                        <div className="ai-eff-stat__icon">📡</div>
                                        <div>
                                            <div className="ai-eff-stat__label">Avg Apparent Power</div>
                                            <div className="ai-eff-stat__value">{(efficiency.apparentPower.avg * 1000).toFixed(0)} VA</div>
                                            <div className="ai-eff-stat__sub">Peak: {(efficiency.apparentPower.max * 1000).toFixed(0)} VA</div>
                                        </div>
                                    </div>
                                    <div className="ai-eff-stat">
                                        <div className="ai-eff-stat__icon">🌡️</div>
                                        <div>
                                            <div className="ai-eff-stat__label">Voltage Stability</div>
                                            <div className="ai-eff-stat__value">{efficiency.voltageStability.avg}V <span style={{ fontSize: 12, color: "#64748b" }}>±{efficiency.voltageStability.std}V</span></div>
                                            <div className="ai-eff-stat__sub">Range: {efficiency.voltageStability.min}V – {efficiency.voltageStability.max}V</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Score breakdown */}
                            <div className="card" style={{ marginTop: 20 }}>
                                <div className="card__header">
                                    <h3 className="card__title">📊 Efficiency Score Breakdown</h3>
                                    <span className={`tag tag--${efficiency.efficiency.score >= 80 ? "green" : efficiency.efficiency.score >= 65 ? "orange" : "red"}`}>
                                        Grade {efficiency.efficiency.grade}
                                    </span>
                                </div>
                                <div className="ai-score-breakdown">
                                    {[
                                        { label: "Power Factor Score", score: efficiency.efficiency.pfScore, weight: "40%", color: "#8b5cf6" },
                                        { label: "Voltage Stability", score: efficiency.efficiency.voltageScore, weight: "30%", color: "#3b82f6" },
                                        { label: "Anomaly Rate Score", score: efficiency.efficiency.anomalyScore, weight: "30%", color: "#22c55e" }
                                    ].map((s, i) => (
                                        <div key={i} className="ai-score-row">
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.label}</span>
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <span style={{ fontSize: 11, color: "#64748b" }}>weight {s.weight}</span>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.score}/100</span>
                                                </div>
                                            </div>
                                            <div style={{ height: 8, background: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden" }}>
                                                <div style={{
                                                    height: "100%", width: `${s.score}%`,
                                                    background: s.color,
                                                    borderRadius: 4, transition: "width 1s ease"
                                                }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Daily peak load + Hourly PF side by side */}
                            <div className="content-grid content-grid--1-1" style={{ marginTop: 20 }}>
                                {/* Daily peak load (matches Python daily_peak output) */}
                                <div className="card">
                                    <div className="card__header">
                                        <h3 className="card__title">📅 Daily Peak Load (30 Days)</h3>
                                        <span className="tag tag--blue">kW</span>
                                    </div>
                                    <div style={{ marginBottom: 8 }}>
                                        <Sparkline
                                            data={efficiency.dailyPeak.map(d => d.peakKW)}
                                            color="#f97316"
                                            height={80}
                                        />
                                    </div>
                                    <div className="table-wrapper">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Peak (kW)</th>
                                                    <th>Avg (kW)</th>
                                                    <th>Cost (₹)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {efficiency.dailyPeak.slice(-10).reverse().map((d, i) => (
                                                    <tr key={i}>
                                                        <td>{d.date}</td>
                                                        <td style={{ color: "#f97316", fontWeight: 600 }}>{d.peakKW.toFixed(2)}</td>
                                                        <td>{d.avgKW.toFixed(3)}</td>
                                                        <td>₹{d.totalCost.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Hourly power factor */}
                                <div className="card">
                                    <div className="card__header">
                                        <h3 className="card__title">⚡ Hourly Power Factor (Last 7 Days)</h3>
                                        <span className="tag tag--purple">PF</span>
                                    </div>
                                    <div className="bar-chart-h" style={{ marginTop: 8 }}>
                                        {efficiency.hourlyEfficiency.filter((_, i) => i % 2 === 0).map((h, i) => (
                                            <div key={i} className="bar-chart-h__item">
                                                <span className="bar-chart-h__label">{h.label}</span>
                                                <div className="bar-chart-h__track">
                                                    <div
                                                        className="bar-chart-h__fill"
                                                        style={{
                                                            width: `${(h.avgPF / 1) * 100}%`,
                                                            background: h.avgPF >= 0.85
                                                                ? "linear-gradient(90deg, #22c55e, #4ade80)"
                                                                : "linear-gradient(90deg, #ef4444, #f87171)"
                                                        }}
                                                    />
                                                </div>
                                                <span className="bar-chart-h__value"
                                                    style={{ color: h.avgPF >= 0.85 ? "#4ade80" : "#f87171" }}>
                                                    {h.avgPF.toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="ai-model-note" style={{ marginTop: 16 }}>
                                        <span>📌</span> PF below 0.85 (red) indicates reactive power waste — consider power factor correction capacitors.
                                    </div>
                                </div>
                            </div>

                            {/* Voltage stability sparkline */}
                            <div className="card" style={{ marginTop: 20 }}>
                                <div className="card__header">
                                    <h3 className="card__title">🔋 Voltage Stability Analysis</h3>
                                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#64748b" }}>
                                        <span>Min: <b style={{ color: "#f87171" }}>{efficiency.voltageStability.min}V</b></span>
                                        <span>Avg: <b style={{ color: "#3b82f6" }}>{efficiency.voltageStability.avg}V</b></span>
                                        <span>Max: <b style={{ color: "#4ade80" }}>{efficiency.voltageStability.max}V</b></span>
                                    </div>
                                </div>
                                <Sparkline
                                    data={efficiency.hourlyEfficiency.map(h => h.avgPowerKW * 1000)}
                                    color="#3b82f6"
                                    height={100}
                                />
                                <div className="ai-voltage-stats">
                                    <div className="ai-voltage-chip">
                                        <span className="ai-voltage-chip__label">Grid Stability</span>
                                        <span className="ai-voltage-chip__value" style={{ color: efficiency.voltageStability.std < 5 ? "#22c55e" : "#f97316" }}>
                                            {efficiency.voltageStability.std < 5 ? "Stable" : "Minor Fluctuation"}
                                        </span>
                                    </div>
                                    <div className="ai-voltage-chip">
                                        <span className="ai-voltage-chip__label">Std Deviation</span>
                                        <span className="ai-voltage-chip__value">±{efficiency.voltageStability.std}V</span>
                                    </div>
                                    <div className="ai-voltage-chip">
                                        <span className="ai-voltage-chip__label">Total Readings</span>
                                        <span className="ai-voltage-chip__value">{efficiency.efficiency.totalReadings.toLocaleString()}</span>
                                    </div>
                                    <div className="ai-voltage-chip">
                                        <span className="ai-voltage-chip__label">Anomaly Count</span>
                                        <span className="ai-voltage-chip__value">{efficiency.efficiency.anomalyCount}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )
                )}
            </div>
        </Layout>
    );
}

export default AIInsightsPage;
