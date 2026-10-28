import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../AuthContext";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../demoApi";

/* ── Feature cards ───────────────────────────────────────────────────── */
const features = [
  ["01", "One connected workspace", "Give manufacturers, suppliers, warehouse teams and logistics partners a shared place to coordinate."],
  ["02", "Operations with context", "Bring procurement, inventory and delivery workflows together as the platform grows."],
  ["03", "Explainable decisions", "Build toward practical optimization with clear assumptions and transparent route planning."],
];

/* ── Live ticker data ─────────────────────────────────────────────────── */
const METRICS = [
  { label: "Shipments tracked", value: 12847, suffix: "",  delta: +3,   decimal: false },
  { label: "On-time rate",      value: 97.4,  suffix: "%", delta: +0.2, decimal: true  },
  { label: "Suppliers online",  value: 348,   suffix: "",  delta: +1,   decimal: false },
  { label: "Avg lead time",     value: 4.2,   suffix: "d", delta: -0.1, decimal: true  },
];

/* ── Network node definitions ────────────────────────────────────────── */
const NODES = [
  { id: "hub",       label: "CONTROL TOWER", icon: "◎", cls: "node-hub",   top: "40%", left: "calc(50% - 44px)", right: "auto" },
  { id: "supplier",  label: "SUPPLIER",       icon: "⌂", cls: "node-top",   top: "11%", left: "calc(50% - 41px)", right: "auto" },
  { id: "warehouse", label: "WAREHOUSE",      icon: "▣", cls: "node-left",  top: "62%", left: "10%",              right: "auto" },
  { id: "logistics", label: "LOGISTICS",      icon: "↗", cls: "node-right", top: "62%", left: "auto",             right: "10%"  },
];

const NODE_INFO = {
  hub:       "All systems nominal · 12 alerts resolved",
  supplier:  "Supplier API synced · 4 POs confirmed",
  warehouse: "Inventory updated · 99.1% accuracy",
  logistics: "3 routes optimised · ETA on track",
};

const PHRASES = ["together.", "faster.", "smarter.", "at scale."];

const ROLE_ICONS = {
  manufacturer:       "🏭",
  supplier:           "📦",
  warehouse_manager:  "🏪",
  logistics_provider: "🚚",
  admin:              "🛡️",
};

/* ── Demo Login Modal ────────────────────────────────────────────────── */
function DemoModal({ onClose }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");
  const overlayRef = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handlePick(account) {
    setError("");
    setLoading(account.email);
    try {
      await login({ email: account.email, password: DEMO_PASSWORD });
      navigate("/dashboard");
    } catch {
      setError("Could not sign in — please try again.");
      setLoading(null);
    }
  }

  return (
    <div
      className="demo-modal-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Try a demo account"
    >
      <div className="demo-modal">
        <div className="demo-modal-header">
          <div>
            <p className="demo-modal-eyebrow">NO SIGN-UP NEEDED</p>
            <h2 className="demo-modal-title">Pick a role &amp; explore</h2>
            <p className="demo-modal-sub">
              Each account has pre-loaded data — POs, shipments, inventory &amp; more.
              Shared password: <code className="demo-modal-pwd">{DEMO_PASSWORD}</code>
            </p>
          </div>
          <button className="demo-modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <div className="demo-modal-accounts">
          {DEMO_ACCOUNTS.map((account) => {
            const isLoading = loading === account.email;
            return (
              <button
                key={account.email}
                className={`demo-modal-card ${isLoading ? "demo-modal-card-loading" : ""}`}
                onClick={() => handlePick(account)}
                disabled={loading !== null}
                aria-busy={isLoading}
              >
                <span className="demo-card-icon">{ROLE_ICONS[account.role] ?? "👤"}</span>
                <span className="demo-card-body">
                  <strong className="demo-card-label">{account.label}</strong>
                  <small className="demo-card-org">{account.organization}</small>
                  <small className="demo-card-email">{account.email}</small>
                </span>
                <span className="demo-card-arrow" aria-hidden="true">
                  {isLoading ? <span className="demo-spinner" /> : "→"}
                </span>
              </button>
            );
          })}
        </div>

        {error && <p className="demo-modal-error" role="alert">{error}</p>}

        <p className="demo-modal-note">
          All data lives in your browser only — nothing is sent to a server.
        </p>
      </div>
    </div>
  );
}

/* ── Animated counter hook ───────────────────────────────────────────── */
function useCounter(target, duration, decimal) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCurrent(decimal ? parseFloat((target * eased).toFixed(1)) : Math.round(target * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, decimal]);

  return current;
}

/* ── Metric tile ─────────────────────────────────────────────────────── */
function MetricTile({ metric, index }) {
  const count = useCounter(metric.value, 1000 + index * 150, metric.decimal);
  const up = metric.delta > 0;
  return (
    <div className="hero-metric">
      <span className="hero-metric-label">{metric.label}</span>
      <strong className="hero-metric-value">
        {metric.decimal ? count.toFixed(1) : count.toLocaleString()}{metric.suffix}
      </strong>
      <span className={`hero-metric-delta ${up ? "delta-up" : "delta-down"}`}>
        {up ? "▲" : "▼"} {Math.abs(metric.delta)}{metric.suffix} today
      </span>
    </div>
  );
}

/* ── SVG animated connection lines ───────────────────────────────────── */
function ConnectionLines({ activeNode }) {
  const hub       = { x: 50, y: 51 };
  const positions = {
    supplier:  { x: 50, y: 19 },
    warehouse: { x: 18, y: 72 },
    logistics: { x: 82, y: 72 },
  };

  return (
    <svg className="hero-svg-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {Object.entries(positions).map(([id, pos]) => {
        const active = activeNode === id || activeNode === "hub";
        const dur = id === "supplier" ? "2.4s" : id === "warehouse" ? "3.1s" : "2.7s";
        return (
          <g key={id}>
            <line
              x1={hub.x} y1={hub.y}
              x2={pos.x} y2={pos.y}
              className={`svg-line ${active ? "svg-line-active" : ""}`}
            />
            <circle r="1.2" className={`svg-dot ${active ? "svg-dot-active" : ""}`}>
              <animateMotion
                dur={dur}
                repeatCount="indefinite"
                path={`M${hub.x},${hub.y} L${pos.x},${pos.y}`}
              />
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Hero visual ─────────────────────────────────────────────────────── */
function HeroVisual() {
  const [activeNode, setActiveNode] = useState("hub");
  const [syncCount, setSyncCount] = useState(0);
  const cycleRef = useRef(null);

  const startCycle = useCallback((startId) => {
    clearInterval(cycleRef.current);
    let idx = NODES.findIndex((n) => n.id === startId);
    cycleRef.current = setInterval(() => {
      idx = (idx + 1) % NODES.length;
      setActiveNode(NODES[idx].id);
      setSyncCount((c) => c + 1);
    }, 2200);
  }, []);

  useEffect(() => {
    startCycle("hub");
    return () => clearInterval(cycleRef.current);
  }, [startCycle]);

  const handleNodeClick = useCallback((id) => {
    setActiveNode(id);
    startCycle(id);
  }, [startCycle]);

  return (
    <div className="hero-visual" aria-label="Interactive supply-chain network">
      <div className="visual-glow" />
      <ConnectionLines activeNode={activeNode} />

      {NODES.map((node) => (
        <button
          key={node.id}
          className={`network-node ${node.cls} ${activeNode === node.id ? "node-active" : ""}`}
          style={{ top: node.top, left: node.left, right: node.right }}
          onClick={() => handleNodeClick(node.id)}
          aria-label={`Inspect ${node.label}`}
          aria-pressed={activeNode === node.id}
        >
          <span>{node.icon}</span>
          <small>{node.label}</small>
          {activeNode === node.id && <span className="node-ring" aria-hidden="true" />}
        </button>
      ))}

      {/* Info chip */}
      <div className="visual-info-chip" key={activeNode}>
        <span className="chip-dot" />
        <span className="chip-text">{NODE_INFO[activeNode]}</span>
      </div>

      <div className="visual-caption">
        <span className="caption-pulse" />
        Live network · {syncCount} syncs
      </div>
    </div>
  );
}

/* ── Typewriter phrase ───────────────────────────────────────────────── */
function TypewriterPhrase() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const phrase = PHRASES[phraseIdx];
    clearTimeout(timerRef.current);
    if (!deleting && displayed.length < phrase.length) {
      timerRef.current = setTimeout(() => setDisplayed(phrase.slice(0, displayed.length + 1)), 70);
    } else if (!deleting && displayed.length === phrase.length) {
      timerRef.current = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && displayed.length > 0) {
      timerRef.current = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setPhraseIdx((i) => (i + 1) % PHRASES.length);
    }
    return () => clearTimeout(timerRef.current);
  }, [displayed, deleting, phraseIdx]);

  return (
    <em className="typewriter-phrase" aria-live="polite">
      {displayed}<span className="typewriter-cursor" aria-hidden="true">|</span>
    </em>
  );
}

/* ── Scroll-reveal hook ──────────────────────────────────────────────── */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ── Feature card ────────────────────────────────────────────────────── */
function FeatureCard({ number, title, description, delay }) {
  const [ref, visible] = useScrollReveal(0.1);
  return (
    <article
      ref={ref}
      className={`feature-card ${visible ? "feature-card-visible" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="feature-number">{number}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="landing">
      {/* Demo modal */}
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}

      {/* Nav */}
      <header className="landing-nav">
        <a className="brand" href="/">
          <span className="brand-mark">G</span>
          <span>Global<span className="brand-light">Chain</span></span>
        </a>
        <div className="landing-actions">
          <ThemeToggle />
          <Link className="button button-quiet" to="/login">Sign in</Link>
          <Link className="button button-primary" to="/register">
            Create workspace <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className={`hero ${heroVisible ? "hero-visible" : ""}`}>
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              SUPPLY CHAIN COLLABORATION
            </div>

            <h1>
              Move your supply chain forward,{" "}
              <TypewriterPhrase />
            </h1>

            <p className="hero-description">
              A shared operations workspace for the people and organisations
              that keep goods moving — from supplier coordination to the last mile.
            </p>

            <div className="hero-metrics">
              {METRICS.map((m, i) => (
                <MetricTile key={m.label} metric={m} index={i} />
              ))}
            </div>

            <div className="hero-actions">
              <Link className="button button-primary button-large" to="/register">
                Get started <span aria-hidden="true">→</span>
              </Link>
              <button
                className="button button-demo"
                onClick={() => setShowDemo(true)}
                type="button"
              >
                <span className="demo-btn-pulse" aria-hidden="true" />
                Try demo <span aria-hidden="true">⚡</span>
              </button>
            </div>

            <div className="hero-actions-secondary">
              <Link className="text-link" to="/login">I already have an account</Link>
            </div>

            <div className="hero-footnote">
              <span className="secure-icon" aria-hidden="true">✓</span>
              Secure organisation workspaces · No credit card required
            </div>
          </div>

          <HeroVisual />
        </section>

        {/* Features */}
        <section className="feature-section">
          <div className="section-heading">
            <span className="eyebrow">BUILT FOR COORDINATION</span>
            <h2>Complex operations.<br /><span>One shared view.</span></h2>
          </div>
          <div className="feature-grid">
            {features.map(([number, title, description], i) => (
              <FeatureCard
                key={number}
                number={number}
                title={title}
                description={description}
                delay={i * 90}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>GlobalChain <span>·</span> Intelligent Global Supply Chain Collaboration Platform</span>
        <span>Connected supply-chain operations</span>
      </footer>
    </div>
  );
}
