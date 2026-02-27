import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

const API_BASE = "http://localhost:5000/api/auth";


function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1️⃣ Check auth profile
                const profileRes = await fetch("http://localhost:5000/api/auth/profile", {
                    credentials: "include",
                });

                if (!profileRes.ok) {
                    navigate("/auth");
                    return;
                }

                const profileData = await profileRes.json();
                setUser(profileData);

                // 2️⃣ Fetch dashboard data
                const dashRes = await fetch("http://localhost:5000/api/dashboard", {
                    credentials: "include",
                });

                const dashData = await dashRes.json();
                setDashboardData(dashData);

            } catch (err) {
                navigate("/auth");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE}/logout`, {
                method: "POST",
                credentials: "include",
            });
        } catch {
            // ignore
        }
        navigate("/auth");
    };

    if (loading) {
        return (
            <div className="dash-loading">
                <div className="dash-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        return "Good Evening";
    };

    return (
        <div className="dash-page">
            {/* Navbar */}
            <nav className="dash-navbar">
                <div className="dash-brand">⚡ VoltEdge Campus</div>
                <div className="dash-nav-right">
                    <div className="dash-user-avatar">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="dash-user-name">{user?.name}</span>
                    <button className="dash-logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="dash-main">
                {/* Welcome Section */}
                <section className="dash-welcome">
                    <div>
                        <h1>
                            {greeting()}, <span className="dash-highlight">{user?.name}</span>
                        </h1>
                        <p className="dash-welcome-sub">
                            Here's your campus energy overview for today.
                        </p>
                    </div>
                </section>

                {/* Stats Cards */}
                <section className="dash-stats">
                    <div className="dash-stat-card">
                        <div className="dash-stat-icon dash-stat-icon-blue">⚡</div>
                        <div className="dash-stat-info">
                            <p className="dash-stat-label">Energy Today</p>
                            <h3 className="dash-stat-value">
                                {dashboardData?.energyToday}
                            </h3>
                        </div>
                    </div>
                    <div className="dash-stat-card">
                        <div className="dash-stat-icon dash-stat-icon-green">📉</div>
                        <div className="dash-stat-info">
                            <p className="dash-stat-label">Savings</p>
                            <h3 className="dash-stat-value">
                                {dashboardData?.savings}
                            </h3>
                        </div>
                    </div>
                    <div className="dash-stat-card">
                        <div className="dash-stat-icon dash-stat-icon-purple">🏫</div>
                        <div className="dash-stat-info">
                            <p className="dash-stat-label">Active Rooms</p>
                            <h3 className="dash-stat-value">
                                {dashboardData?.activeRooms}
                            </h3>
                        </div>
                    </div>
                    <div className="dash-stat-card">
                        <div className="dash-stat-icon dash-stat-icon-orange">🎯</div>
                        <div className="dash-stat-info">
                            <p className="dash-stat-label">Forecast Accuracy</p>
                            <h3 className="dash-stat-value">
                                {dashboardData?.forecastAccuracy}
                            </h3>
                        </div>
                    </div>
                </section>

                {/* Content Grid */}
                <section className="dash-grid">
                    <div className="dash-card dash-card-wide">
                        <h3>Energy Consumption Trend</h3>
                        <div className="dash-chart-placeholder">
                            <div className="dash-bar-chart">
                                <div className="dash-bar" style={{ height: "60%" }}>
                                    <span>Mon</span>
                                </div>
                                <div className="dash-bar" style={{ height: "80%" }}>
                                    <span>Tue</span>
                                </div>
                                <div className="dash-bar" style={{ height: "45%" }}>
                                    <span>Wed</span>
                                </div>
                                <div className="dash-bar" style={{ height: "90%" }}>
                                    <span>Thu</span>
                                </div>
                                <div className="dash-bar" style={{ height: "70%" }}>
                                    <span>Fri</span>
                                </div>
                                <div className="dash-bar" style={{ height: "30%" }}>
                                    <span>Sat</span>
                                </div>
                                <div className="dash-bar" style={{ height: "20%" }}>
                                    <span>Sun</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="dash-card">
                        <h3>Recent Alerts</h3>
                        <div className="dash-alerts">
                            {dashboardData?.alerts?.map((alert, index) => (
                                <div key={index} className={`dash-alert dash-alert-${alert.type}`}>
                                    <span className="dash-alert-dot"></span>
                                    <div>
                                        <p className="dash-alert-title">{alert.title}</p>
                                        <p className="dash-alert-time">{alert.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default Dashboard;
