import React, { useState, useEffect, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import "../styles/layout.css";

// Role-based nav filtering
const ROLE_ACCESS = {
    admin: ["dashboard", "classrooms", "analytics", "ai-insights", "cost", "carbon", "leaderboard", "alerts", "admin"],
    faculty: ["dashboard", "classrooms", "analytics", "ai-insights", "cost", "carbon", "leaderboard", "alerts"],
    student: ["dashboard", "classrooms", "leaderboard", "carbon"],
};

function Layout({ children }) {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    // Live clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Fetch Notifications
    const fetchNotifications = useCallback(async () => {
        try {
            // Get unacknowledged alerts
            const data = await api.get("/alerts?acknowledged=false&limit=5");
            setNotifications(data);
            setUnreadCount(data.length);
        } catch (err) {
            console.error("Notifications fetch error:", err);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const handleLogout = async () => {
        await logout();
        navigate("/auth");
    };

    const handleAcknowledge = async (e, id) => {
        e.stopPropagation();
        try {
            await api.put(`/alerts/${id}/acknowledge`);
            setNotifications(prev => prev.filter(n => n._id !== id));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Acknowledge error:", err);
        }
    };

    const allNavItems = [
        { path: "/dashboard", icon: "📊", label: "Dashboard", key: "dashboard" },
        { path: "/classrooms", icon: "🏫", label: "Classrooms", key: "classrooms" },
        { path: "/analytics", icon: "📈", label: "Analytics", key: "analytics" },
        { path: "/ai-insights", icon: "🧠", label: "AI Insights", key: "ai-insights" },
        { path: "/cost", icon: "💰", label: "Cost", key: "cost" },
        { path: "/carbon", icon: "🌍", label: "Carbon", key: "carbon" },
        { path: "/leaderboard", icon: "🏆", label: "Leaderboard", key: "leaderboard" },
        { path: "/alerts", icon: "🚨", label: "Alerts", key: "alerts" },
        { path: "/admin", icon: "⚙️", label: "Admin", key: "admin" },
    ];

    // Filter nav items by user role
    const userRole = user?.role || "student";
    const allowed = ROLE_ACCESS[userRole] || ROLE_ACCESS.student;
    const navItems = allNavItems.filter(item => allowed.includes(item.key));

    const userName = user?.name || "User";
    const userInitial = userName.charAt(0).toUpperCase();
    const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);

    const dateStr = currentTime.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    const timeAgo = (dateStr) => {
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className="layout" onClick={() => setShowDropdown(false)}>
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : "sidebar--collapsed"}`}>
                <div className="sidebar__header">
                    <div className="sidebar__logo">
                        <span className="sidebar__logo-icon">⚡</span>
                        {sidebarOpen && <span className="sidebar__logo-text">VoltEdge Campus</span>}
                    </div>
                    <button
                        className="sidebar__toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        title={sidebarOpen ? "Collapse" : "Expand"}
                    >
                        {sidebarOpen ? "◀" : "▶"}
                    </button>
                </div>

                <nav className="sidebar__nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
                            }
                            title={item.label}
                        >
                            <span className="sidebar__link-icon">{item.icon}</span>
                            {sidebarOpen && (
                                <span className="sidebar__link-label">{item.label}</span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar__footer">
                    <div className="sidebar__user">
                        <div className="sidebar__avatar">{userInitial}</div>
                        {sidebarOpen && (
                            <div className="sidebar__user-info">
                                <span className="sidebar__user-name">{userName}</span>
                                <span className="sidebar__user-role">{roleLabel}</span>
                            </div>
                        )}
                    </div>
                    {sidebarOpen && (
                        <button className="sidebar__logout" onClick={handleLogout}>
                            Logout
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="layout__main">
                <header className="layout__topbar">
                    <div className="topbar__left">
                        <button
                            className="topbar__menu-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSidebarOpen(!sidebarOpen);
                            }}
                        >
                            ☰
                        </button>
                    </div>
                    <div className="topbar__right">
                        <div
                            className="topbar__notification"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDropdown(!showDropdown);
                            }}
                        >
                            <span className="topbar__bell">🔔</span>
                            {unreadCount > 0 && <span className="topbar__badge">{unreadCount}</span>}

                            {showDropdown && (
                                <div className="topbar__notifications-dropdown" onClick={(e) => e.stopPropagation()}>
                                    <div className="notifications-dropdown__header">
                                        <h3>Notifications</h3>
                                        {unreadCount > 0 && <span>{unreadCount} new</span>}
                                    </div>
                                    <div className="notifications-dropdown__list">
                                        {notifications.length === 0 ? (
                                            <div className="notifications-dropdown__empty">
                                                No new notifications
                                            </div>
                                        ) : (
                                            notifications.map(n => (
                                                <div key={n._id} className="notification-item">
                                                    <div className="notification-item__content">
                                                        <div className="notification-item__header">
                                                            <span className={`notification-item__severity notification-item__severity--${n.severity.toLowerCase()}`}>
                                                                {n.severity}
                                                            </span>
                                                            <span className="notification-item__time">{timeAgo(n.createdAt)}</span>
                                                        </div>
                                                        <p className="notification-item__message">{n.message}</p>
                                                        <button
                                                            className="notification-item__acknowledge"
                                                            onClick={(e) => handleAcknowledge(e, n._id)}
                                                        >
                                                            Mark as read
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="notifications-dropdown__footer">
                                        <button onClick={() => { navigate("/alerts"); setShowDropdown(false); }}>
                                            View all alerts
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="topbar__live-indicator">
                            <span className="topbar__live-dot"></span>
                            <span>Live</span>
                        </div>
                        <div className="topbar__datetime">
                            <span className="topbar__date">{dateStr}</span>
                            <span className="topbar__time">{timeStr}</span>
                        </div>
                    </div>
                </header>
                <div className="layout__content">{children}</div>
            </main>
        </div>
    );
}

export default Layout;
