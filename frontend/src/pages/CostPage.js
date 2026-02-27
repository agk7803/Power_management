import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import "../styles/pages.css";

function CostPage() {
    const [dashboard, setDashboard] = useState(null);
    const [hourly, setHourly] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get("/dashboard").catch(() => null),
            api.get("/dashboard/hourly").catch(() => [])
        ]).then(([dash, trend]) => {
            setDashboard(dash);
            setHourly(trend);
        }).finally(() => setLoading(false));
    }, []);

    // Derive cost from energy (approximate tariff: ₹8/kWh)
    const tariffRate = 8;
    const totalCost = dashboard?.costToday || "₹0";
    const totalEnergy = dashboard?.energyToday || "0 kWh";

    // Hourly cost data
    const hourlyCost = hourly.map(h => ({
        hour: h.hour,
        cost: (h.totalEnergy * tariffRate).toFixed(2)
    }));
    const maxCost = Math.max(...hourlyCost.map(h => parseFloat(h.cost)), 1);

    // Simulated monthly projection (based on today's data × 30)
    const todayEnergyNum = parseFloat((dashboard?.energyToday || "0").replace(/[^\d.]/g, "")) || 0;
    const monthlyProjection = (todayEnergyNum * 30 * tariffRate).toFixed(0);
    const dailyAvg = (todayEnergyNum * tariffRate).toFixed(0);

    return (
        <Layout>
            <div className="page">
                <div className="page__header">
                    <div>
                        <h1 className="page__title">Cost Analysis</h1>
                        <p className="page__subtitle">Track energy costs, tariff analysis, and savings opportunities</p>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading cost data...</div>
                ) : (
                    <>
                        <div className="stats-grid stats-grid--4">
                            <div className="stat-card stat-card--emerald">
                                <div className="stat-card__header"><span className="stat-card__icon">💰</span></div>
                                <div className="stat-card__value">{totalCost}</div>
                                <div className="stat-card__label">Today's Cost</div>
                            </div>
                            <div className="stat-card stat-card--blue">
                                <div className="stat-card__header"><span className="stat-card__icon">⚡</span></div>
                                <div className="stat-card__value">{totalEnergy}</div>
                                <div className="stat-card__label">Energy Today</div>
                            </div>
                            <div className="stat-card stat-card--purple">
                                <div className="stat-card__header"><span className="stat-card__icon">📅</span></div>
                                <div className="stat-card__value">₹{dailyAvg}</div>
                                <div className="stat-card__label">Daily Average</div>
                            </div>
                            <div className="stat-card stat-card--orange">
                                <div className="stat-card__header"><span className="stat-card__icon">📊</span></div>
                                <div className="stat-card__value">₹{monthlyProjection}</div>
                                <div className="stat-card__label">Monthly Projection</div>
                            </div>
                        </div>

                        <div className="content-grid content-grid--2-1">
                            {/* Cost Trend Chart */}
                            <div className="card">
                                <div className="card__header">
                                    <h3 className="card__title">Hourly Cost Breakdown</h3>
                                </div>
                                <div className="chart-area">
                                    <div className="bar-chart-v">
                                        <div className="bar-chart-v__bars">
                                            {hourlyCost.map((h, i) => (
                                                <div key={i} className="bar-chart-v__column">
                                                    <div
                                                        className="bar-chart-v__bar"
                                                        style={{
                                                            height: `${(parseFloat(h.cost) / maxCost) * 100}%`,
                                                            background: `linear-gradient(to top, #10b981, #059669)`
                                                        }}
                                                        title={`₹${h.cost}`}
                                                    />
                                                    {i % 4 === 0 && (
                                                        <span className="bar-chart-v__label">{String(h.hour).padStart(2, "0")}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tariff Info */}
                            <div className="card">
                                <div className="card__header">
                                    <h3 className="card__title">💡 Tariff Info</h3>
                                </div>
                                <div className="summary-grid">
                                    <div className="summary-item">
                                        <span className="summary-item__icon">🏷️</span>
                                        <div>
                                            <p className="summary-item__label">Current Rate</p>
                                            <p className="summary-item__value">₹{tariffRate}/kWh</p>
                                        </div>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-item__icon">📡</span>
                                        <div>
                                            <p className="summary-item__label">Active Devices</p>
                                            <p className="summary-item__value">{dashboard?.activeDevices || 0}</p>
                                        </div>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-item__icon">🏫</span>
                                        <div>
                                            <p className="summary-item__label">Active Rooms</p>
                                            <p className="summary-item__value">{dashboard?.activeRooms || 0}</p>
                                        </div>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-item__icon">🎯</span>
                                        <div>
                                            <p className="summary-item__label">Anomalies</p>
                                            <p className="summary-item__value">{dashboard?.anomaliesToday || 0} today</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}

export default CostPage;
