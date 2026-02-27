import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { api } from "../services/api";
import "../styles/pages.css";
import "../styles/admin.css";

function AdminPage() {
    const [activeTab, setActiveTab] = useState("timetable");

    // Data states
    const [timetable, setTimetable] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [users, setUsers] = useState([]);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    // Form states
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({});

    const tabs = [
        { key: "timetable", label: "📅 Timetable" },
        { key: "classrooms", label: "🏫 Classrooms" },
        { key: "devices", label: "📡 Devices" },
        { key: "users", label: "👥 Users" },
    ];

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [tt, rooms, devs, usrs] = await Promise.all([
                api.get("/timetable").catch(() => []),
                api.get("/classrooms").catch(() => []),
                api.get("/devices").catch(() => []),
                api.get("/auth/users").catch(() => []),
            ]);
            setTimetable(Array.isArray(tt) ? tt : []);
            setClassrooms(Array.isArray(rooms) ? rooms : []);
            setDevices(Array.isArray(devs) ? devs : []);
            setUsers(Array.isArray(usrs) ? usrs : []);
        } catch (err) {
            console.error("Admin fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const showMsg = (text) => {
        setMessage(text);
        setTimeout(() => setMessage(""), 3000);
    };

    // ── TIMETABLE TAB ──────────────────────────────
    const renderTimetable = () => (
        <div className="admin-section">
            <div className="admin-section__header">
                <h3>Timetable Entries ({timetable.length})</h3>
                <button className="btn btn--primary btn--sm" onClick={() => {
                    setFormData({ classroomId: "", day: "Monday", startTime: "09:00", endTime: "10:00", subject: "", faculty: "" });
                    setShowForm("timetable");
                }}>+ Add Entry</button>
            </div>
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Classroom</th>
                            <th>Day</th>
                            <th>Time</th>
                            <th>Subject</th>
                            <th>Faculty</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {timetable.length === 0 ? (
                            <tr className="empty-row"><td colSpan="6">No timetable entries</td></tr>
                        ) : (
                            timetable.map(entry => (
                                <tr key={entry._id}>
                                    <td>{entry.classroomId?.classroomId || entry.classroomId || "—"}</td>
                                    <td>{entry.day}</td>
                                    <td>{entry.startTime} – {entry.endTime}</td>
                                    <td>{entry.subject}</td>
                                    <td>{entry.faculty}</td>
                                    <td>
                                        <button
                                            className="btn btn--sm btn--danger"
                                            onClick={async () => {
                                                try {
                                                    await api.delete(`/timetable/${entry._id}`);
                                                    setTimetable(prev => prev.filter(t => t._id !== entry._id));
                                                    showMsg("Timetable entry deleted");
                                                } catch (err) { showMsg("Error deleting entry"); }
                                            }}
                                        >Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // ── CLASSROOMS TAB ─────────────────────────────
    const renderClassrooms = () => (
        <div className="admin-section">
            <div className="admin-section__header">
                <h3>Classrooms ({classrooms.length})</h3>
                <button className="btn btn--primary btn--sm" onClick={() => {
                    setFormData({ classroomId: "", name: "", capacity: 40, acCount: 1, fanCount: 2, lightCount: 4, hasProjector: false });
                    setShowForm("classroom");
                }}>+ Add Classroom</button>
            </div>
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Room ID</th>
                            <th>Name</th>
                            <th>Capacity</th>
                            <th>ACs</th>
                            <th>Fans</th>
                            <th>Lights</th>
                            <th>Projector</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {classrooms.length === 0 ? (
                            <tr className="empty-row"><td colSpan="8">No classrooms</td></tr>
                        ) : (
                            classrooms.map(room => (
                                <tr key={room._id}>
                                    <td><strong>{room.classroomId}</strong></td>
                                    <td>{room.name}</td>
                                    <td>{room.capacity}</td>
                                    <td>{room.acCount}</td>
                                    <td>{room.fanCount}</td>
                                    <td>{room.lightCount}</td>
                                    <td>{room.hasProjector ? "✅" : "—"}</td>
                                    <td>
                                        <button
                                            className="btn btn--sm btn--danger"
                                            onClick={async () => {
                                                if (!window.confirm(`Delete classroom "${room.classroomId} — ${room.name}"? This cannot be undone.`)) return;
                                                try {
                                                    await api.delete(`/classrooms/${room._id}`);
                                                    setClassrooms(prev => prev.filter(c => c._id !== room._id));
                                                    showMsg(`Classroom ${room.classroomId} deleted`);
                                                } catch (err) {
                                                    showMsg("Error deleting classroom");
                                                }
                                            }}
                                        >Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // ── DEVICES TAB ────────────────────────────────
    const renderDevices = () => (
        <div className="admin-section">
            <div className="admin-section__header">
                <h3>Devices ({devices.length})</h3>
            </div>
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Device ID</th>
                            <th>Classroom</th>
                            <th>Status</th>
                            <th>Last Heartbeat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {devices.length === 0 ? (
                            <tr className="empty-row"><td colSpan="4">No devices registered</td></tr>
                        ) : (
                            devices.map(device => (
                                <tr key={device._id}>
                                    <td><code>{device.deviceId}</code></td>
                                    <td>{device.classroomId?.classroomId || "—"}</td>
                                    <td>
                                        <span className={`tag tag--${device.status === "ACTIVE" ? "green" : device.status === "REGISTERED" ? "blue" : "gray"}`}>
                                            {device.status}
                                        </span>
                                    </td>
                                    <td>{device.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleString() : "—"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // ── USERS TAB ──────────────────────────────────
    const renderUsers = () => (
        <div className="admin-section">
            <div className="admin-section__header">
                <h3>Users ({users.length})</h3>
            </div>
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr className="empty-row"><td colSpan="4">No users</td></tr>
                        ) : (
                            users.map(user => (
                                <tr key={user._id}>
                                    <td><strong>{user.name}</strong></td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`tag tag--${user.role === "admin" ? "red" : user.role === "faculty" ? "purple" : "blue"}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // ── MODAL FORM ─────────────────────────────────
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (showForm === "timetable") {
                const newEntry = await api.post("/timetable", formData);
                setTimetable(prev => [...prev, newEntry]);
                showMsg("Timetable entry added!");
            } else if (showForm === "classroom") {
                const newRoom = await api.post("/classrooms", formData);
                setClassrooms(prev => [...prev, newRoom]);
                showMsg("Classroom added!");
            }
            setShowForm(false);
        } catch (err) {
            showMsg(`Error: ${err.message}`);
        }
    };

    const renderForm = () => {
        if (!showForm) return null;
        return (
            <div className="modal-overlay" onClick={() => setShowForm(false)}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal__header">
                        <h3>{showForm === "timetable" ? "Add Timetable Entry" : "Add Classroom"}</h3>
                        <button className="modal__close" onClick={() => setShowForm(false)}>✕</button>
                    </div>
                    <form onSubmit={handleFormSubmit} className="modal__form">
                        {showForm === "timetable" ? (
                            <>
                                <div className="form-group">
                                    <label>Classroom</label>
                                    <select
                                        value={formData.classroomId}
                                        onChange={e => setFormData({ ...formData, classroomId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select classroom</option>
                                        {classrooms.map(r => (
                                            <option key={r._id} value={r._id}>{r.classroomId} — {r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Day</label>
                                    <select value={formData.day} onChange={e => setFormData({ ...formData, day: e.target.value })}>
                                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Start Time</label>
                                        <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>End Time</label>
                                        <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Subject</label>
                                    <input type="text" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} required placeholder="e.g. Data Structures" />
                                </div>
                                <div className="form-group">
                                    <label>Faculty</label>
                                    <input type="text" value={formData.faculty} onChange={e => setFormData({ ...formData, faculty: e.target.value })} required placeholder="e.g. Dr. Smith" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Room ID</label>
                                        <input type="text" value={formData.classroomId} onChange={e => setFormData({ ...formData, classroomId: e.target.value })} required placeholder="e.g. RM-201" />
                                    </div>
                                    <div className="form-group">
                                        <label>Name</label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. Computer Lab" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Capacity</label>
                                        <input type="number" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="form-group">
                                        <label>ACs</label>
                                        <input type="number" value={formData.acCount} onChange={e => setFormData({ ...formData, acCount: parseInt(e.target.value) })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Fans</label>
                                        <input type="number" value={formData.fanCount} onChange={e => setFormData({ ...formData, fanCount: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Lights</label>
                                        <input type="number" value={formData.lightCount} onChange={e => setFormData({ ...formData, lightCount: parseInt(e.target.value) })} />
                                    </div>
                                </div>
                                <div className="form-group form-group--checkbox">
                                    <input type="checkbox" checked={formData.hasProjector} onChange={e => setFormData({ ...formData, hasProjector: e.target.checked })} />
                                    <label>Has Projector</label>
                                </div>
                            </>
                        )}
                        <button type="submit" className="btn btn--primary">Save</button>
                    </form>
                </div>
            </div>
        );
    };

    // ── RENDER ─────────────────────────────────────
    return (
        <Layout>
            <div className="page">
                <div className="page__header">
                    <div>
                        <h1 className="page__title">Admin Panel</h1>
                        <p className="page__subtitle">Manage campus settings, classrooms, devices, and users</p>
                    </div>
                    <div className="page__actions">
                        <button className="btn btn--outline" onClick={fetchData}>🔄 Refresh</button>
                    </div>
                </div>

                {message && <div className="toast">{message}</div>}

                <div className="tab-bar">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`tab-btn ${activeTab === tab.key ? "tab-btn--active" : ""}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="admin-loading">Loading admin data...</div>
                ) : (
                    <>
                        {activeTab === "timetable" && renderTimetable()}
                        {activeTab === "classrooms" && renderClassrooms()}
                        {activeTab === "devices" && renderDevices()}
                        {activeTab === "users" && renderUsers()}
                    </>
                )}

                {renderForm()}
            </div>
        </Layout>
    );
}

export default AdminPage;