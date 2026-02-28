import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import "../styles/pages.css";

// Local-timezone date string (avoids UTC offset issues with toISOString)
const getLocalDateStr = (d = new Date()) => {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${yr}-${mo}-${da}`;
};

function ClassroomsPage() {
    const [classrooms, setClassrooms] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(getLocalDateStr());
    const [latestEnergy, setLatestEnergy] = useState(null);
    const [history, setHistory] = useState([]);
    const [weekHistory, setWeekHistory] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);


    // Fetch classroom list
    useEffect(() => {
        api.get("/classrooms").then(data => {
            setClassrooms(data);
            if (data.length > 0) setSelectedRoomId(data[0]._id);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    // Fetch data for selected room
    const fetchRoomData = useCallback(async () => {
        if (!selectedRoomId) return;
        try {
            const isToday = selectedDate === getLocalDateStr();

            // Calculate the week (Mon-Sun) surrounding the selected date
            const sel = new Date(selectedDate);
            const dayIdx = sel.getDay(); // 0=Sun
            const mondayOffset = dayIdx === 0 ? -6 : 1 - dayIdx;
            const weekStart = new Date(sel);
            weekStart.setDate(sel.getDate() + mondayOffset);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            const weekFrom = getLocalDateStr(weekStart);
            const weekTo = getLocalDateStr(weekEnd);

            const [latest, hist, weekHist, tt] = await Promise.all([
                isToday ? api.get(`/energy/latest?classroomId=${selectedRoomId}`).catch(() => null) : Promise.resolve(null),
                api.get(`/energy/history/${selectedRoomId}?date=${selectedDate}`).catch(() => []),
                api.get(`/energy/history/${selectedRoomId}?from=${weekFrom}&to=${weekTo}`).catch(() => []),
                api.get(`/timetable?classroomId=${selectedRoomId}`).catch(() => [])
            ]);
            setLatestEnergy(latest);
            setHistory(Array.isArray(hist) ? hist : []);
            setWeekHistory(Array.isArray(weekHist) ? weekHist : []);
            setTimetable(Array.isArray(tt) ? tt : []);
        } catch (err) {
            console.error(err);
        }
    }, [selectedRoomId, selectedDate]);

    useEffect(() => { fetchRoomData(); }, [fetchRoomData]);

    // Auto-refresh every 10 seconds ONLY if today is selected
    useEffect(() => {
        if (!selectedRoomId) return;
        const isToday = selectedDate === getLocalDateStr();
        if (!isToday) return;

        const timer = setInterval(fetchRoomData, 10000);
        return () => clearInterval(timer);
    }, [selectedRoomId, selectedDate, fetchRoomData]);

    const room = classrooms.find(c => c._id === selectedRoomId);

    // Build hourly power from history
    const hourlyPower = Array(24).fill(0);
    history.forEach(entry => {
        const hour = new Date(entry.timestamp).getHours();
        hourlyPower[hour] = Math.max(hourlyPower[hour], entry.power || 0);
    });
    const maxPower = Math.max(...hourlyPower, 1);

    // Weekly daily usage (Mon-Sun) from weekHistory
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weekDayMap = {};
    weekDays.forEach(d => { weekDayMap[d] = 0; });
    weekHistory.forEach(entry => {
        const d = new Date(entry.timestamp);
        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        if (weekDayMap[dayName] !== undefined) {
            weekDayMap[dayName] += (entry.energy || 0);
        }
    });
    const dailyUsage = weekDays.map(day => ({ day, usage: parseFloat(weekDayMap[day].toFixed(4)) }));
    const maxDailyUsage = Math.max(...dailyUsage.map(d => d.usage), 0.01);

    const isToday = selectedDate === getLocalDateStr();
    const livePower = isToday ? (latestEnergy?.power || 0) : 0;
    const dateUsage = history.reduce((sum, e) => sum + (e.energy || 0), 0).toFixed(4);
    const dateCost = history.reduce((sum, e) => sum + (e.cost || 0), 0).toFixed(4);
    const dateLabel = isToday ? "Today" : new Date(selectedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    // Avg voltage/current from history (for past dates)
    const avgVoltage = history.length > 0 ? (history.reduce((s, e) => s + (e.voltage || 0), 0) / history.length).toFixed(1) : 0;
    const avgCurrent = history.length > 0 ? (history.reduce((s, e) => s + (e.current || 0), 0) / history.length).toFixed(4) : 0;

    return (
        <Layout>
            <div className="page">
                <div className="page__header">
                    <div>
                        <h1 className="page__title">Classrooms</h1>
                        <p className="page__subtitle">Monitor individual classroom energy usage and occupancy</p>
                    </div>
                    <div className="page__actions">
                        <input
                            type="date"
                            className="select-input"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ marginRight: '10px' }}
                        />
                        <select
                            className="select-input"
                            value={selectedRoomId || ""}
                            onChange={(e) => setSelectedRoomId(e.target.value)}
                        >
                            {classrooms.map(room => (
                                <option key={room._id} value={room._id}>
                                    {room.classroomId} — {room.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading classrooms...</div>
                ) : !room ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>No classrooms found. Add classrooms in Admin settings.</div>
                ) : (
                    <>
                        {/* Room Status Header */}
                        <div className="room-header">
                            <div className="room-header__info">
                                <h2 className="room-header__name">{room.classroomId} — {room.name}</h2>
                                <div className="room-header__meta">
                                    <span className="tag tag--purple">Capacity: {room.capacity}</span>
                                    <span className="tag tag--blue">ACs: {room.acCount} | Fans: {room.fanCount} | Lights: {room.lightCount}</span>
                                    {room.hasProjector && <span className="tag tag--green">Projector ✓</span>}
                                </div>
                            </div>
                            <div className="room-header__live">
                                {isToday ? (
                                    <div className="live-power">
                                        <span className="live-power__label">Live Power</span>
                                        <span className="live-power__value">{livePower}W</span>
                                        <span className="live-power__indicator">
                                            <span className={`pulse-dot pulse-dot--${livePower > 0 ? "green" : "gray"}`}></span>
                                        </span>
                                    </div>
                                ) : (
                                    <div className="live-power">
                                        <span className="live-power__label">Viewing</span>
                                        <span className="live-power__value" style={{ fontSize: 16 }}>{dateLabel}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="stats-grid stats-grid--4">
                            <div className="stat-card stat-card--blue">
                                <div className="stat-card__header"><span className="stat-card__icon">⚡</span></div>
                                <div className="stat-card__value">{isToday ? `${livePower}W` : "—"}</div>
                                <div className="stat-card__label">{isToday ? "Live Power" : "No Live Data"}</div>
                            </div>
                            <div className="stat-card stat-card--green">
                                <div className="stat-card__header"><span className="stat-card__icon">🔋</span></div>
                                <div className="stat-card__value">{dateUsage} kWh</div>
                                <div className="stat-card__label">{dateLabel} Usage</div>
                            </div>
                            <div className="stat-card stat-card--purple">
                                <div className="stat-card__header"><span className="stat-card__icon">🔌</span></div>
                                <div className="stat-card__value">{isToday ? (latestEnergy?.voltage || avgVoltage) : avgVoltage}V</div>
                                <div className="stat-card__label">{isToday ? "Voltage" : "Avg Voltage"}</div>
                            </div>
                            <div className="stat-card stat-card--emerald">
                                <div className="stat-card__header"><span className="stat-card__icon">📊</span></div>
                                <div className="stat-card__value">{isToday ? (latestEnergy?.current?.toFixed(4) || avgCurrent) : avgCurrent}A</div>
                                <div className="stat-card__label">{isToday ? "Current" : "Avg Current"}</div>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div className="content-grid content-grid--1-1">
                            {/* Power Chart */}
                            <div className="card">
                                <div className="card__header">
                                    <h3 className="card__title">Power Consumption ({dateLabel})</h3>
                                    {isToday && (
                                        <div className="card__badge card__badge--live">
                                            <span className="pulse-dot"></span> Live
                                        </div>
                                    )}
                                </div>
                                <div className="chart-area">
                                    <div className="line-chart">
                                        <div className="line-chart__container">
                                            <svg viewBox="0 0 480 180" className="line-chart__svg">
                                                <defs>
                                                    <linearGradient id="roomLineGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                <path
                                                    d={`M ${hourlyPower.map((v, i) => `${i * 20},${180 - (v / maxPower) * 180}`).join(" L ")} L 460,180 L 0,180 Z`}
                                                    fill="url(#roomLineGrad)"
                                                />
                                                <path
                                                    d={`M ${hourlyPower.map((v, i) => `${i * 20},${180 - (v / maxPower) * 180}`).join(" L ")}`}
                                                    fill="none"
                                                    stroke="#10b981"
                                                    strokeWidth="2.5"
                                                />
                                            </svg>
                                            <div className="line-chart__x-axis">
                                                {["00", "06", "12", "18", "24"].map(h => (
                                                    <span key={h}>{h}:00</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Daily Usage */}
                            <div className="card">
                                <div className="card__header">
                                    <h3 className="card__title">Weekly Usage (Mon-Sun)</h3>
                                </div>
                                <div className="bar-chart-h">
                                    {dailyUsage.length === 0 ? (
                                        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No historical data yet</div>
                                    ) : (
                                        dailyUsage.map((d, i) => (
                                            <div key={i} className="bar-chart-h__item">
                                                <span className="bar-chart-h__label">{d.day}</span>
                                                <div className="bar-chart-h__track">
                                                    <div
                                                        className="bar-chart-h__fill"
                                                        style={{ width: `${(d.usage / maxDailyUsage) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="bar-chart-h__value">{d.usage} kWh</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Schedule Timeline */}
                        <div className="card" style={{ marginTop: 20 }}>
                            <div className="card__header">
                                <h3 className="card__title">📅 Today's Schedule</h3>
                                <span className="tag tag--green">{timetable.length} classes</span>
                            </div>
                            <div className="schedule-timeline">
                                {timetable.length === 0 ? (
                                    <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                                        No schedule configured for this room
                                    </div>
                                ) : (
                                    timetable.map((slot, i) => {
                                        const now = new Date();
                                        const [sh, sm] = (slot.startTime || "00:00").split(":").map(Number);
                                        const [eh, em] = (slot.endTime || "00:00").split(":").map(Number);
                                        const startMin = sh * 60 + sm;
                                        const endMin = eh * 60 + em;
                                        const nowMin = now.getHours() * 60 + now.getMinutes();
                                        const status = nowMin >= startMin && nowMin < endMin ? "active" : nowMin >= endMin ? "completed" : "upcoming";

                                        return (
                                            <div key={i} className={`schedule-item schedule-item--${status}`}>
                                                <div className="schedule-item__time">{slot.startTime} – {slot.endTime}</div>
                                                <div className="schedule-item__dot"></div>
                                                <div className="schedule-item__content">
                                                    <p className="schedule-item__subject">{slot.subject}</p>
                                                    <p className="schedule-item__prof">{slot.faculty}</p>
                                                </div>
                                                <span className={`tag tag--${status === "completed" ? "gray" : status === "active" ? "green" : "blue"}`}>
                                                    {status}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}

export default ClassroomsPage;
