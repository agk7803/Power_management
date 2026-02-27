import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

// ── SVG COMPONENTS ─────────────────────────────────────────────────────────

function LightningBolt({ className, style }) {
    return (
        <svg className={className} style={style} viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bolt-grad-a" x1="12" y1="2" x2="12" y2="38" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00ffaa" />
                    <stop offset="100%" stopColor="#00c8ff" />
                </linearGradient>
            </defs>
            <path d="M14 2L2 22H11L10 38L22 18H13L14 2Z"
                stroke="url(#bolt-grad-a)" strokeWidth="1.5" strokeLinejoin="round"
                fill="url(#bolt-grad-a)" fillOpacity="0.18"
            />
        </svg>
    );
}

function BulbSvg({ className, style }) {
    return (
        <svg className={className} style={style} viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bulb-grad-a" x1="16" y1="2" x2="16" y2="36" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#aaff00" />
                    <stop offset="100%" stopColor="#00ffaa" />
                </linearGradient>
            </defs>
            <path d="M16 2C9.37 2 4 7.37 4 14c0 4.5 2.4 8.4 6 10.6V30h12v-5.4c3.6-2.2 6-6.1 6-10.6C28 7.37 22.63 2 16 2z"
                stroke="url(#bulb-grad-a)" strokeWidth="1.5" fill="url(#bulb-grad-a)" fillOpacity="0.1"
            />
            <rect x="10" y="30" width="12" height="3" rx="1" stroke="#00ffaa" strokeWidth="1" fill="none" opacity="0.7" />
            <rect x="12" y="33" width="8" height="3" rx="1" stroke="#00ffaa" strokeWidth="1" fill="none" opacity="0.5" />
            <circle cx="16" cy="14" r="4" stroke="#aaff00" strokeWidth="0.8" fill="#aaff00" fillOpacity="0.12" />
            {/* Rays */}
            <line x1="16" y1="6" x2="16" y2="9" stroke="#aaff00" strokeWidth="1" opacity="0.5" />
            <line x1="22" y1="8" x2="20" y2="10" stroke="#aaff00" strokeWidth="1" opacity="0.4" />
            <line x1="10" y1="8" x2="12" y2="10" stroke="#aaff00" strokeWidth="1" opacity="0.4" />
        </svg>
    );
}

function CircuitNode({ className, style }) {
    return (
        <svg className={className} style={style} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="6" stroke="#00ffaa" strokeWidth="1.2" fill="none" />
            <circle cx="40" cy="40" r="2.5" fill="#00ffaa" opacity="0.7" />
            {/* Lines */}
            <line x1="40" y1="0" x2="40" y2="34" stroke="#00ffaa" strokeWidth="0.8" opacity="0.4" />
            <line x1="40" y1="46" x2="40" y2="80" stroke="#00ffaa" strokeWidth="0.8" opacity="0.4" />
            <line x1="0" y1="40" x2="34" y2="40" stroke="#00c8ff" strokeWidth="0.8" opacity="0.4" />
            <line x1="46" y1="40" x2="80" y2="40" stroke="#00c8ff" strokeWidth="0.8" opacity="0.4" />
            {/* Terminal boxes */}
            <rect x="0" y="36" width="8" height="8" stroke="#00c8ff" strokeWidth="0.8" fill="none" opacity="0.5" />
            <rect x="72" y="36" width="8" height="8" stroke="#00c8ff" strokeWidth="0.8" fill="none" opacity="0.5" />
            <rect x="36" y="0" width="8" height="8" stroke="#00ffaa" strokeWidth="0.8" fill="none" opacity="0.5" />
            <rect x="36" y="72" width="8" height="8" stroke="#00ffaa" strokeWidth="0.8" fill="none" opacity="0.5" />
            {/* Diagonal traces */}
            <line x1="40" y1="34" x2="28" y2="22" stroke="#00c8ff" strokeWidth="0.6" opacity="0.25" />
            <line x1="40" y1="34" x2="52" y2="22" stroke="#00c8ff" strokeWidth="0.6" opacity="0.25" />
        </svg>
    );
}

function BatterySvg({ className, style }) {
    return (
        <svg className={className} style={style} viewBox="0 0 28 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="0" width="12" height="4" rx="1" stroke="#00ffaa" strokeWidth="1" fill="none" opacity="0.6" />
            <rect x="2" y="4" width="24" height="44" rx="3" stroke="#00ffaa" strokeWidth="1.2" fill="none" />
            {/* Charge bars */}
            <rect x="5" y="38" width="18" height="7" rx="1" fill="#00ffaa" opacity="0.6" />
            <rect x="5" y="30" width="18" height="6" rx="1" fill="#00ffaa" opacity="0.45" />
            <rect x="5" y="22" width="18" height="6" rx="1" fill="#aaff00" opacity="0.3" />
            {/* Lightning inside */}
            <path d="M16 10L11 20H15L14 28L19 18H15L16 10Z" stroke="#00c8ff" strokeWidth="0.8" fill="#00c8ff" fillOpacity="0.2" />
        </svg>
    );
}

function AuthPage() {
    const navigate = useNavigate();
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "student",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isLogin) {
                await login(formData.email, formData.password);
            } else {
                await register(formData.name, formData.email, formData.password, formData.role);
            }
            navigate("/dashboard");
        } catch (err) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError("");
        setFormData({ name: "", email: "", password: "", role: "student" });
    };

    return (
        <div className="auth-page">
            {/* Orbs */}
            <div className="landing-orb landing-orb-1 landing-parallax-slow" data-speed="0.2" />
            <div className="landing-orb landing-orb-2 landing-parallax-slow" data-speed="0.15" />
            <div className="landing-orb landing-orb-3 landing-parallax-slow" data-speed="0.1" />

            {/* ── FLOATING ENERGY ELEMENTS ── */}

            {/* Lightning bolts — scattered */}
            <LightningBolt className="landing-float landing-float--bolt-tl landing-parallax-slow" data-speed="0.07" />
            <LightningBolt className="landing-float landing-float--bolt-tr landing-parallax-slow" data-speed="0.11" />
            <LightningBolt className="landing-float landing-float--bolt-bl landing-parallax-slow" data-speed="0.06" />
            <LightningBolt className="landing-float landing-float--bolt-br landing-parallax-slow" data-speed="0.09" />
            <LightningBolt className="landing-float landing-float--bolt-mid landing-parallax-slow" data-speed="0.05" />

            {/* Bulbs */}
            <BulbSvg className="landing-float landing-float--bulb-l landing-parallax-slow" data-speed="0.08" />
            <BulbSvg className="landing-float landing-float--bulb-r landing-parallax-slow" data-speed="0.13" />

            {/* Circuit nodes */}
            <CircuitNode className="landing-float landing-float--circuit-1 landing-parallax-slow" data-speed="0.04" />
            <CircuitNode className="landing-float landing-float--circuit-2 landing-parallax-slow" data-speed="0.10" />
            <CircuitNode className="landing-float landing-float--circuit-3 landing-parallax-slow" data-speed="0.06" />

            {/* Battery */}
            <BatterySvg className="landing-float landing-float--batt-l landing-parallax-slow" data-speed="0.09" />
            <BatterySvg className="landing-float landing-float--batt-r landing-parallax-slow" data-speed="0.07" />

            <div className="landing-hero-scanline" />

            <div className="auth-container" style={{ zIndex: 10, background: '#111827' }}>
                {/* Left panel */}
                <div className="auth-left">
                    <div className="auth-left-content">
                        <h1 className="auth-brand" onClick={() => navigate("/")}>
                            ⚡ VoltEdge Campus
                        </h1>
                        <p className="auth-tagline">
                            Intelligent energy monitoring for smart campuses. Real-time data,
                            AI forecasting &amp; optimization — all in one platform.
                        </p>
                        <div className="auth-features-mini">
                            <div className="auth-feature-item">
                                <span className="auth-feature-icon">📊</span>
                                <span>Real-Time Monitoring</span>
                            </div>
                            <div className="auth-feature-item">
                                <span className="auth-feature-icon">🤖</span>
                                <span>AI Forecasting</span>
                            </div>
                            <div className="auth-feature-item">
                                <span className="auth-feature-icon">🔔</span>
                                <span>Anomaly Detection</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right panel — form */}
                <div className="auth-right" style={{ padding: '20px 40px', overflowY: 'auto' }}>
                    <div className="auth-form-wrapper" style={{ margin: 'auto' }}>
                        <button className="auth-back-btn" onClick={() => navigate("/")}>
                            ← Back to Home
                        </button>
                        <h2 className="auth-title">
                            {isLogin ? "Welcome Back" : "Create Account"}
                        </h2>
                        <p className="auth-subtitle">
                            {isLogin
                                ? "Sign in to access your energy dashboard"
                                : "Join us and start saving energy today"}
                        </p>

                        {error && <div className="auth-error">{error}</div>}

                        <form onSubmit={handleSubmit} className="auth-form">
                            {!isLogin && (
                                <div className="auth-field">
                                    <label htmlFor="auth-name">Full Name</label>
                                    <input
                                        id="auth-name"
                                        type="text"
                                        name="name"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required={!isLogin}
                                    />
                                </div>
                            )}

                            <div className="auth-field">
                                <label htmlFor="auth-email">Email Address</label>
                                <input
                                    id="auth-email"
                                    type="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="auth-field">
                                <label htmlFor="auth-password">Password</label>
                                <input
                                    id="auth-password"
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                />
                            </div>

                            {!isLogin && (
                                <div className="auth-field">
                                    <label htmlFor="auth-role">Role</label>
                                    <select
                                        id="auth-role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                    >
                                        <option value="student">🎓 Student</option>
                                        <option value="faculty">👨‍🏫 Faculty</option>
                                        <option value="admin">🔑 Admin</option>
                                    </select>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="auth-submit-btn"
                                disabled={loading}
                            >
                                {loading
                                    ? "Please wait..."
                                    : isLogin
                                        ? "Sign In"
                                        : "Create Account"}
                            </button>
                        </form>

                        <p className="auth-toggle">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                            <span onClick={toggleMode} className="auth-toggle-link">
                                {isLogin ? "Sign Up" : "Sign In"}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuthPage;
