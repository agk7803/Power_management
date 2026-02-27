import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import "../styles/pages.css";

function CarbonPage() {
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

    // CO₂ emission factor: 0.82 kg CO₂ per kWh (India grid average)
    const emissionFactor = 0.82;
    const co2Today = dashboard?.co2Today || "0 kg";
    const co2Num = parseFloat((co2Today || "0").replace(/[^\d.]/g, "")) || 0;
    const treesEquiv = (co2Num / 21.77 * 365).toFixed(1); // kg CO₂ absorbed per tree per year
    const monthlyProjection = (co2Num * 30).toFixed(1);

    // Hourly carbon from energy data
    const hourlyCO2 = hourly.map(h => ({
        hour: h.hour,
        co2: (h.totalEnergy * emissionFactor).toFixed(3)
    }));
    const maxCO2 = Math.max(...hourlyCO2.map(h => parseFloat(h.co2)), 0.001);

    return (
        <Layout>
            <div className="page">
                <div className="page__header">
                    <div>
                        <h1 className="page__title">Carbon Footprint</h1>
                        <p className="page__subtitle">Track CO₂ emissions and environmental impact</p>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading carbon data...</div>
                ) : (
                    <>
                        <div className="stats-grid stats-grid--4">
                            <div className="stat-card stat-card--green">
                                <div className="stat-card__header"><span className="stat-card__icon">🌿</span></div>
                                <div className="stat-card__value">{co2Today}</div>
                                <div className="stat-card__label">CO₂ Today</div>
                            </div>
                            <div className="stat-card stat-card--teal">
                                <div className="stat-card__header"><span className="stat-card__icon">🌳</span></div>
                                <div className="stat-card__value">{treesEquiv}</div>
                                <div className="stat-card__label">Trees Needed (yearly equivalent)</div>
                            </div>
                            <div className="stat-card stat-card--emerald">
                                <div className="stat-card__header"><span className="stat-card__icon">📅</span></div>
                                <div className="stat-card__value">{monthlyProjection} kg</div>
                                <div className="stat-card__label">Monthly Projection</div>
                            </div>
                            <div className="stat-card stat-card--blue">
                                <div className="stat-card__header"><span className="stat-card__icon">⚡</span></div>
                                <div className="stat-card__value">{dashboard?.energyToday || "0 kWh"}</div>
                                <div className="stat-card__label">Energy Today</div>
                            </div>
                        </div>

                        <div className="content-grid content-grid--2-1">
                            {/* Carbon Trend */}
                            <div className="card">
                                <div className="card__header">
                                    <h3 className="card__title">🌍 Hourly CO₂ Emissions</h3>
                                </div>
                                <div className="chart-area">
                                    <div className="bar-chart-v">
                                        <div className="bar-chart-v__bars">
                                            {hourlyCO2.map((h, i) => (
                                                <div key={i} className="bar-chart-v__column">
                                                    <div
                                                        className="bar-chart-v__bar"
                                                        style={{
                                                            height: `${(parseFloat(h.co2) / maxCO2) * 100}%`,
                                                            background: `linear-gradient(to top, #10b981, #065f46)`
                                                        }}
                                                        title={`${h.co2} kg CO₂`}
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

                            {/* Carbon Facts */}
                            <div className="card">
                                <div className="card__header">
                                    <h3 className="card__title">🌱 Did You Know?</h3>
                                </div>
                                <div className="summary-grid">
                                    <div className="summary-item">
                                        <span className="summary-item__icon">🏭</span>
                                        <div>
                                            <p className="summary-item__label">Emission Factor</p>
                                            <p className="summary-item__value">{emissionFactor} kg/kWh</p>
                                        </div>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-item__icon">🌳</span>
                                        <div>
                                            <p className="summary-item__label">Trees/Year Offset</p>
                                            <p className="summary-item__value">{treesEquiv} trees</p>
                                        </div>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-item__icon">🚗</span>
                                        <div>
                                            <p className="summary-item__label">Equiv. Driving</p>
                                            <p className="summary-item__value">{(co2Num / 0.21).toFixed(0)} km</p>
                                        </div>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-item__icon">💡</span>
                                        <div>
                                            <p className="summary-item__label">Active Rooms</p>
                                            <p className="summary-item__value">{dashboard?.activeRooms || 0}</p>
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

export default CarbonPage;
