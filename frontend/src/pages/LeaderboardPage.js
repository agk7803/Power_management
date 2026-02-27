import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import "../styles/pages.css";

function LeaderboardPage() {
    const [loading, setLoading] = useState(true);
    const [rankings, setRankings] = useState([]);

    useEffect(() => {
        api.get("/classrooms").then(async (rooms) => {

            // Fetch energy history for each room and compute rankings
            const roomStats = await Promise.all(
                rooms.map(async (room) => {
                    try {
                        const history = await api.get(`/energy/history/${room._id}`);
                        const entries = Array.isArray(history) ? history : [];
                        const totalEnergy = entries.reduce((sum, e) => sum + (e.energy || 0), 0);
                        const avgPower = entries.length > 0
                            ? entries.reduce((sum, e) => sum + (e.power || 0), 0) / entries.length
                            : 0;
                        const anomalies = entries.filter(e => e.isAnomaly).length;

                        // Efficiency score: lower energy + fewer anomalies = better
                        // Score = 100 - (normalized energy penalty) - (anomaly penalty)
                        const score = Math.max(0, Math.min(100,
                            100 - (totalEnergy * 10) - (anomalies * 5)
                        ));

                        return {
                            id: room._id,
                            name: room.classroomId,
                            fullName: room.name,
                            totalEnergy: totalEnergy.toFixed(2),
                            avgPower: Math.round(avgPower),
                            anomalies,
                            score: Math.round(score),
                            dataPoints: entries.length,
                        };
                    } catch {
                        return {
                            id: room._id,
                            name: room.classroomId,
                            fullName: room.name,
                            totalEnergy: "0",
                            avgPower: 0,
                            anomalies: 0,
                            score: 100,
                            dataPoints: 0,
                        };
                    }
                })
            );

            // Sort by score (highest = most efficient)
            roomStats.sort((a, b) => b.score - a.score);
            setRankings(roomStats);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const getMedal = (rank) => {
        if (rank === 0) return "🥇";
        if (rank === 1) return "🥈";
        if (rank === 2) return "🥉";
        return `#${rank + 1}`;
    };

    const getScoreColor = (score) => {
        if (score >= 80) return "green";
        if (score >= 50) return "orange";
        return "red";
    };

    return (
        <Layout>
            <div className="page">
                <div className="page__header">
                    <div>
                        <h1 className="page__title">Leaderboard</h1>
                        <p className="page__subtitle">Classroom energy efficiency rankings</p>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Computing rankings...</div>
                ) : rankings.length === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                        No classrooms found. Add classrooms in Admin settings.
                    </div>
                ) : (
                    <>
                        {/* Top 3 Podium */}
                        <div className="podium">
                            {rankings.slice(0, 3).map((room, i) => (
                                <div key={room.id} className={`podium__item podium__item--${i + 1}`}>
                                    <div className="podium__medal">{getMedal(i)}</div>
                                    <h3 className="podium__name">{room.name}</h3>
                                    <p className="podium__fullname">{room.fullName}</p>
                                    <div className={`podium__score tag tag--${getScoreColor(room.score)}`}>
                                        {room.score}/100
                                    </div>
                                    <p className="podium__energy">{room.totalEnergy} kWh</p>
                                </div>
                            ))}
                        </div>

                        {/* Full Rankings Table */}
                        <div className="card" style={{ marginTop: 24 }}>
                            <div className="card__header">
                                <h3 className="card__title">🏆 Full Rankings</h3>
                                <span className="card__count">{rankings.length} rooms</span>
                            </div>
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Room</th>
                                            <th>Name</th>
                                            <th>Efficiency Score</th>
                                            <th>Energy (kWh)</th>
                                            <th>Avg Power (W)</th>
                                            <th>Anomalies</th>
                                            <th>Data Points</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rankings.map((room, i) => (
                                            <tr key={room.id}>
                                                <td><strong>{getMedal(i)}</strong></td>
                                                <td><strong>{room.name}</strong></td>
                                                <td>{room.fullName}</td>
                                                <td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        <div className="progress-bar" style={{ width: 80 }}>
                                                            <div
                                                                className={`progress-bar__fill progress-bar__fill--${getScoreColor(room.score)}`}
                                                                style={{ width: `${room.score}%` }}
                                                            />
                                                        </div>
                                                        <span>{room.score}</span>
                                                    </div>
                                                </td>
                                                <td>{room.totalEnergy}</td>
                                                <td>{room.avgPower}W</td>
                                                <td>
                                                    <span className={`tag tag--${room.anomalies === 0 ? "green" : "red"}`}>
                                                        {room.anomalies}
                                                    </span>
                                                </td>
                                                <td>{room.dataPoints}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}

export default LeaderboardPage;
