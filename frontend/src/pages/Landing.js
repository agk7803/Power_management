import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';

// ── DATA ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '🔌', num: '01', title: 'Classroom Smart Energy Meter', desc: 'Installed in each classroom to measure real-time electricity usage and power consumption per room.', tag: 'IoT Hardware' },
  { icon: '👀', num: '02', title: 'Occupancy Detection System', desc: 'Detects if a classroom is occupied or empty using motion sensors, CO₂ sensors, or WiFi device count.', tag: 'Sensor Fusion' },
  { icon: '🧠', num: '03', title: 'AI-Based Waste Detection', desc: 'Detects abnormal power usage — AC running in empty rooms, lights left ON, sudden energy spikes — and alerts admin.', tag: 'Machine Learning' },
  { icon: '📅', num: '04', title: 'Timetable-Based Automation', desc: 'Connects with class schedule to pre-cool rooms before class and auto-shut systems after sessions end.', tag: 'Smart Automation' },
  { icon: '📊', num: '05', title: 'Live Energy Dashboard', desc: 'Web app for admins, faculty & students. Shows real-time usage, daily/weekly trends, cost in ₹ and carbon impact.', tag: 'Web App' },
  { icon: '🏆', num: '06', title: 'Green Classroom Leaderboard', desc: 'Ranks classrooms by efficiency and highlights the top 3 energy-saving rooms to drive healthy competition.', tag: 'Gamification' },
  { icon: '🎮', num: '07', title: 'Student Engagement & Badges', desc: 'Energy-saving challenges, digital green badges, department-level competitions and rewards for best-performing classes.', tag: 'Engagement' },
  { icon: '🌍', num: '08', title: 'Carbon Footprint Tracker', desc: 'Converts energy usage to CO₂ emissions in real time, showing carbon saved and environmental impact.', tag: 'Sustainability' }
];

const WHY_POINTS = [
  { icon: '⚡', title: 'Real-Time Intelligence', desc: 'Know exactly which classroom is wasting energy this second — not in a monthly report.' },
  { icon: '🌱', title: 'Measurable Sustainability', desc: 'Track your campus carbon footprint live and convert every watt saved into an environmental win.' },
  { icon: '💸', title: 'Immediate Cost Reduction', desc: 'Stop paying for AC cooling empty halls. Our clients see savings from day one of deployment.' },
  { icon: '🎓', title: 'Student-Driven Culture', desc: 'Turn passive students into active sustainability champions through gamification and leaderboards.' },
];

const METRICS = [
  { label: 'Average Energy Saved', value: '40%', width: '40%' },
  { label: 'Cost Reduction', value: '35%', width: '35%' },
  { label: 'Carbon Footprint Cut', value: '50%', width: '50%' },
];

// ── HOOKS ─────────────────────────────────────────────────────────────────────

function useRevealOnScroll() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('landing-visible'); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.landing-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function useParallax() {
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      document.querySelectorAll('.landing-parallax-slow').forEach((el) => {
        const speed = parseFloat(el.dataset.speed || 0.3);
        el.style.transform = `translateY(${scrollY * speed}px)`;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}



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

// ── FEATURE CARD ────────────────────────────────────────────────────────────

function FeatureCard({ feature, delay }) {
  return (
    <div className={`landing-feature-card landing-reveal landing-reveal-delay-${delay}`} data-hover>
      <span className="landing-feature-number">{feature.num}</span>
      <span className="landing-feature-icon">{feature.icon}</span>
      <div className="landing-feature-title">{feature.title}</div>
      <p className="landing-feature-desc">{feature.desc}</p>
      <span className="landing-feature-tag">{feature.tag}</span>
    </div>
  );
}

function MetricBar({ label, value, width, delay }) {
  return (
    <div className={`landing-metric-bar-row landing-reveal landing-reveal-delay-${delay}`}>
      <div className="landing-metric-bar-header">
        <span>{label}</span>
        <span style={{ color: 'var(--accent)', fontFamily: 'Orbitron, monospace' }}>{value}</span>
      </div>
      <div className="landing-metric-bar-track">
        <div className="landing-metric-bar-fill" style={{ width }} />
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  useRevealOnScroll();
  useParallax();

  const navigate = useNavigate();

  return (
    <>


      {/* NAV */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">VoltEdge</div>
        <ul className="landing-nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#why">Why Us</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
        <button className="landing-nav-cta" data-hover onClick={() => navigate('/auth')}>Login</button>
      </nav>

      {/* ── HERO ── */}
      <section className="landing-hero" id="hero">

        {/* Visible grid */}
        <div className="landing-hero-grid" />

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

        {/* Scan line */}
        <div className="landing-hero-scanline" />

        {/* ── CONTENT ── */}
        <div className="landing-hero-badge">● LIVE SYSTEM ACTIVE — IoT + AI + Cloud</div>

        <h1 className="landing-hero-title">
          Smart Campus.
          <span className="landing-line-accent">Zero Waste Energy.</span>
        </h1>

        <p className="landing-hero-sub">
          A low-cost smart energy system that monitors and optimizes electricity usage
          classroom-wise in real time, using IoT + AI. Helping colleges reduce energy waste,
          save money, and make students part of the sustainability movement.
        </p>

        <button className="landing-hero-cta" data-hover onClick={() => navigate('/auth')}>
          Explore the System
          <span className="landing-hero-cta-arrow">→</span>
        </button>

        <div className="landing-hero-stats">
          <div className="landing-stat-card">
            <div className="landing-stat-num">14</div>
            <div className="landing-stat-label">Smart Modules</div>
          </div>
          <div className="landing-stat-card">
            <div className="landing-stat-num">40%</div>
            <div className="landing-stat-label">Avg. Energy Saved</div>
          </div>
          <div className="landing-stat-card">
            <div className="landing-stat-num">Real-Time</div>
            <div className="landing-stat-label">Dashboard Analytics</div>
          </div>
        </div>

        <div className="landing-scroll-indicator">
          <div className="landing-scroll-line" />
          scroll
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="landing-features" id="features">
        <div className="landing-features-header">
          <div className="landing-section-label landing-reveal">System Capabilities</div>
          <h2 className="landing-section-title landing-reveal landing-reveal-delay-1">
            8 Integrated Features.<br />One Unified Platform.
          </h2>
          <p className="landing-section-desc landing-reveal landing-reveal-delay-2">
            From hardware sensors to AI predictions — every component of the smart energy
            ecosystem, built for real campuses at minimal cost.
          </p>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.num} feature={f} delay={(i % 4) + 1} />
          ))}
        </div>
      </section>

      {/* ── WHY ── */}
      <section className="landing-why" id="why">
        <div className="landing-why-container">
          <div className="landing-why-left landing-reveal">
            <div className="landing-why-visual">
              <div className="landing-why-ring landing-ring-1" />
              <div className="landing-why-ring landing-ring-2" />
              <div className="landing-why-ring landing-ring-3" />
              <div className="landing-why-center">
                <div className="landing-why-center-num">4.2×</div>
                <div className="landing-why-center-label">ROI in Year 1</div>
              </div>
            </div>
            <div className="landing-metric-bars">
              {METRICS.map((m, i) => (
                <MetricBar key={m.label} {...m} delay={i + 1} />
              ))}
            </div>
          </div>

          <div className="landing-why-right">
            <div className="landing-section-label landing-reveal">Why VoltEdge</div>
            <h2 className="landing-section-title landing-reveal landing-reveal-delay-1">
              Built for Colleges.<br />Designed for Impact.
            </h2>
            <p className="landing-section-desc landing-reveal landing-reveal-delay-2">
              Other solutions are expensive, rigid, and cloud-dependent. VoltEdge is modular,
              affordable, and works even when the internet is down — while students actually engage with it.
            </p>
            <div className="landing-why-points" style={{ marginTop: '2.5rem' }}>
              {WHY_POINTS.map((p, i) => (
                <div
                  key={p.title}
                  className={`landing-why-point landing-reveal landing-reveal-delay-${i + 1}`}
                  data-hover
                >
                  <div className="landing-why-point-icon">{p.icon}</div>
                  <div>
                    <div className="landing-why-point-title">{p.title}</div>
                    <p className="landing-why-point-desc">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="landing-footer-cta" id="contact">
        <h2 className="landing-footer-cta-title landing-reveal">
          Ready to Make Your Campus<br />
          <span>Energy Intelligent?</span>
        </h2>
        <p className="landing-footer-cta-sub landing-reveal landing-reveal-delay-1">
          Deploy in days, not months. Start with one classroom — scale campus-wide.
        </p>
        <div className="landing-footer-btns landing-reveal landing-reveal-delay-2">
          <button className="landing-hero-cta" data-hover>
            Request a Demo <span className="landing-hero-cta-arrow">→</span>
          </button>
          <button className="landing-btn-outline" data-hover>View Architecture</button>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-logo">VoltEdge</div>
        <div>IoT · AI · Sustainability · Smart Campus</div>
        <div>© 2026 VoltEdge Systems</div>
      </footer>
    </>
  );
}