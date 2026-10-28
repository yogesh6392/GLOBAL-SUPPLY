import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../AuthContext";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../demoApi";

/* ── Live ticker data ─────────────────────────────────────────────────── */
const BASE_METRICS = [
  { id: "shipments", label: "Shipments tracked", value: 12847, suffix: "",  delta: +3,   decimal: false },
  { id: "ontime",    label: "On-time rate",      value: 97.4,  suffix: "%", delta: +0.2, decimal: true  },
  { id: "suppliers", label: "Suppliers online",  value: 348,   suffix: "",  delta: +1,   decimal: false },
  { id: "leadtime",  label: "Avg lead time",     value: 4.2,   suffix: "d", delta: -0.1, decimal: true  },
];

/* ── Network node definitions ────────────────────────────────────────── */
const NODES = [
  {
    id: "hub",
    label: "CONTROL TOWER",
    icon: "◎",
    cls: "node-hub",
    top: "40%",
    left: "calc(50% - 44px)",
    location: "Global Command · Central HQ",
    capacity: "99.4%",
    telemetry: "Nominal · 0 critical alerts",
    activeShipments: 142
  },
  {
    id: "supplier",
    label: "SUPPLIER",
    icon: "⌂",
    cls: "node-top",
    top: "12%",
    left: "calc(50% - 41px)",
    location: "Apex Components · Plant #4",
    capacity: "88.2%",
    telemetry: "Fulfillment active · 4 POs in prep",
    activeShipments: 28
  },
  {
    id: "warehouse",
    label: "WAREHOUSE",
    icon: "▣",
    cls: "node-left",
    top: "62%",
    left: "10%",
    location: "Northstar Depot · Zone A",
    capacity: "76.5%",
    telemetry: "Cycle counting complete · RFID synced",
    activeShipments: 64
  },
  {
    id: "logistics",
    label: "LOGISTICS",
    icon: "↗",
    cls: "node-right",
    top: "62%",
    right: "10%",
    location: "Meridian Cross-Dock · Harbor Port",
    capacity: "93.1%",
    telemetry: "Gate dispatch on schedule · GPS live",
    activeShipments: 89
  },
];

const SCENARIOS = {
  normal: {
    label: "Standard Operations",
    icon: "🟢",
    speed: "normal",
    chip: "All systems nominal · Global transit on schedule",
    hubStatus: "Nominal",
    metricDeltas: { shipments: 0, ontime: 0, leadtime: 0 }
  },
  congestion: {
    label: "Port Congestion",
    icon: "🟡",
    speed: "slow",
    chip: "Port bottleneck detected · Rerouting 14 container loads via alternate rail",
    hubStatus: "Congestion alert",
    metricDeltas: { shipments: +12, ontime: -3.8, leadtime: +1.4 }
  },
  stockout: {
    label: "Stockout Surge",
    icon: "🔴",
    speed: "fast",
    chip: "Low-stock trigger in Zone A · Auto-replenishment order PO-993 dispatched",
    hubStatus: "Auto-reordering",
    metricDeltas: { shipments: +45, ontime: +0.4, leadtime: -0.6 }
  }
};

const PHRASES = ["together.", "faster.", "smarter.", "at scale."];

const ROLE_ICONS = {
  manufacturer:       "🏭",
  supplier:           "📦",
  warehouse_manager:  "🏪",
  logistics_provider: "🚚",
  admin:              "🛡️",
};

/* ── Animated counter hook ───────────────────────────────────────────── */
function useCounter(target, duration = 1000, decimal = false) {
  const [current, setCurrent] = useState(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const initial = current;
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = initial + (target - initial) * eased;
      setCurrent(decimal ? parseFloat(val.toFixed(1)) : Math.round(val));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, decimal]);

  return current;
}

/* ── Metric tile ─────────────────────────────────────────────────────── */
function MetricTile({ metric, index, scenarioDelta = 0 }) {
  const target = metric.decimal
    ? parseFloat((metric.value + scenarioDelta).toFixed(1))
    : Math.round(metric.value + scenarioDelta);

  const count = useCounter(target, 800 + index * 100, metric.decimal);
  const up = metric.delta > 0;

  return (
    <div className="hero-metric">
      <span className="hero-metric-label">{metric.label}</span>
      <strong className="hero-metric-value">
        {metric.decimal ? count.toFixed(1) : count.toLocaleString()}{metric.suffix}
      </strong>
      <span className={`hero-metric-delta ${up ? "delta-up" : "delta-down"}`}>
        {up ? "▲" : "▼"} {Math.abs(metric.delta)}{metric.suffix} active
      </span>
    </div>
  );
}

/* ── SVG animated connection lines ───────────────────────────────────── */
function ConnectionLines({ activeNode, scenario }) {
  const hub = { x: 50, y: 51 };
  const positions = {
    supplier:  { x: 50, y: 19 },
    warehouse: { x: 18, y: 72 },
    logistics: { x: 82, y: 72 },
  };

  const durMultiplier = scenario === "congestion" ? 1.8 : scenario === "stockout" ? 0.6 : 1;

  return (
    <svg className="hero-svg-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {Object.entries(positions).map(([id, pos]) => {
        const active = activeNode === id || activeNode === "hub";
        const baseDur = id === "supplier" ? 2.4 : id === "warehouse" ? 3.1 : 2.7;
        const dur = `${(baseDur * durMultiplier).toFixed(2)}s`;

        return (
          <g key={id}>
            <line
              x1={hub.x} y1={hub.y}
              x2={pos.x} y2={pos.y}
              className={`svg-line ${active ? "svg-line-active" : ""} ${scenario !== "normal" ? `svg-line-${scenario}` : ""}`}
            />
            <circle r="1.3" className={`svg-dot ${active ? "svg-dot-active" : ""} ${scenario !== "normal" ? `svg-dot-${scenario}` : ""}`}>
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

/* ── Interactive Hero Visual ─────────────────────────────────────────── */
function HeroVisual() {
  const [activeNodeId, setActiveNodeId] = useState("hub");
  const [scenario, setScenario] = useState("normal");
  const [syncCount, setSyncCount] = useState(42);
  const [pinging, setPinging] = useState(false);
  const cycleRef = useRef(null);

  const activeNode = useMemo(() => NODES.find((n) => n.id === activeNodeId) || NODES[0], [activeNodeId]);

  const startCycle = useCallback((startId) => {
    clearInterval(cycleRef.current);
    let idx = NODES.findIndex((n) => n.id === startId);
    cycleRef.current = setInterval(() => {
      idx = (idx + 1) % NODES.length;
      setActiveNodeId(NODES[idx].id);
      setSyncCount((c) => c + 1);
    }, 3200);
  }, []);

  useEffect(() => {
    startCycle("hub");
    return () => clearInterval(cycleRef.current);
  }, [startCycle]);

  const handleNodeClick = useCallback((id) => {
    setActiveNodeId(id);
    startCycle(id);
  }, [startCycle]);

  const handlePing = () => {
    setPinging(true);
    setSyncCount((c) => c + 1);
    setTimeout(() => setPinging(false), 900);
  };

  return (
    <div className="hero-visual" aria-label="Interactive supply-chain network control center">
      <div className={`visual-glow ${scenario !== "normal" ? `visual-glow-${scenario}` : ""}`} />

      {/* Interactive Scenario Bar */}
      <div className="scenario-controls" aria-label="Simulation scenario controls">
        <span className="scenario-tag">Simulate:</span>
        {Object.entries(SCENARIOS).map(([key, s]) => (
          <button
            key={key}
            type="button"
            className={`scenario-btn ${scenario === key ? "scenario-btn-active" : ""}`}
            onClick={() => {
              setScenario(key);
              setSyncCount((c) => c + 3);
            }}
          >
            <span aria-hidden="true">{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      <ConnectionLines activeNode={activeNodeId} scenario={scenario} />

      {/* Network Nodes */}
      {NODES.map((node) => (
        <button
          key={node.id}
          className={`network-node ${node.cls} ${activeNodeId === node.id ? "node-active" : ""} ${pinging && activeNodeId === node.id ? "node-pinging" : ""}`}
          style={{ top: node.top, left: node.left, right: node.right }}
          onClick={() => handleNodeClick(node.id)}
          aria-label={`Inspect ${node.label}`}
          aria-pressed={activeNodeId === node.id}
        >
          <span>{node.icon}</span>
          <small>{node.label}</small>
          {activeNodeId === node.id && <span className="node-ring" aria-hidden="true" />}
        </button>
      ))}

      {/* Dynamic Telemetry Inspector Drawer */}
      <div className="node-inspector-hud" key={activeNode.id}>
        <div className="hud-header">
          <div className="hud-title-wrap">
            <span className="hud-dot" />
            <strong className="hud-name">{activeNode.label}</strong>
            <span className="hud-loc">{activeNode.location}</span>
          </div>
          <button
            className="hud-ping-btn"
            onClick={handlePing}
            disabled={pinging}
            title="Send live diagnostic ping"
            type="button"
          >
            {pinging ? "Ping sent…" : "⚡ Ping node"}
          </button>
        </div>
        <div className="hud-stats-row">
          <div className="hud-stat">
            <span>Capacity</span>
            <strong>{activeNode.capacity}</strong>
          </div>
          <div className="hud-stat">
            <span>In-Flight</span>
            <strong>{activeNode.activeShipments} POs</strong>
          </div>
          <div className="hud-stat">
            <span>Status</span>
            <strong className="hud-status-text">{activeNode.telemetry.split("·")[0]}</strong>
          </div>
        </div>
      </div>

      {/* Real-time Scenario Banner */}
      <div className={`visual-info-chip scenario-chip-${scenario}`} key={scenario + activeNodeId}>
        <span className="chip-dot" />
        <span className="chip-text">{SCENARIOS[scenario].chip}</span>
      </div>

      <div className="visual-caption">
        <span className="caption-pulse" />
        Telemetry Online · {syncCount} live packets received
      </div>
    </div>
  );
}

/* ── Global Live Dispatch Stream ─────────────────────────────────────── */
const DISPATCH_EVENTS = [
  { id: 1, icon: "✈️", time: "Just now", text: "Air Cargo GC-904 cleared customs at Frankfurt Airport (FRA)", tone: "tone-blue" },
  { id: 2, icon: "🚢", time: "1m ago",  text: "Container Vessel Pacific Star docked at Rotterdam Berth 12", tone: "tone-green" },
  { id: 3, icon: "📦", time: "3m ago",  text: "RFID Gate check complete: 180 Stainless Fastener units received", tone: "tone-purple" },
  { id: 4, icon: "🚚", time: "5m ago",  text: "Cross-dock transfer initiated for Meridian Regional Depot", tone: "tone-amber" },
  { id: 5, icon: "🤖", time: "7m ago",  text: "Dijkstra Route Optimizer updated carrier path for optimal fuel rate", tone: "tone-blue" }
];

function LiveDispatchStream() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % DISPATCH_EVENTS.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [paused]);

  const current = DISPATCH_EVENTS[index];

  return (
    <div className="dispatch-ticker-bar">
      <div className="dispatch-ticker-inner">
        <div className="dispatch-ticker-badge">
          <span className="dispatch-live-pulse" />
          LIVE DISPATCH STREAM
        </div>
        <div className="dispatch-ticker-content" key={current.id}>
          <span className="dispatch-icon">{current.icon}</span>
          <span className="dispatch-text">{current.text}</span>
          <span className="dispatch-time">{current.time}</span>
        </div>
        <button
          className="dispatch-pause-toggle"
          onClick={() => setPaused(!paused)}
          type="button"
          aria-label={paused ? "Resume stream" : "Pause stream"}
        >
          {paused ? "▶ Resume" : "⏸ Pause"}
        </button>
      </div>
    </div>
  );
}

/* ── Interactive ROI Calculator ──────────────────────────────────────── */
function InteractiveRoiCalculator() {
  const [monthlyShipments, setMonthlyShipments] = useState(2500);
  const [delayPercent, setDelayPercent] = useState(7);
  const [costPerDelay, setCostPerDelay] = useState(180);

  // Calculations
  const annualDelayed = useMemo(() => {
    return Math.round((monthlyShipments * 12) * (delayPercent / 100));
  }, [monthlyShipments, delayPercent]);

  const projectedSavedDollars = useMemo(() => {
    // Platform typical reduction: 68% of preventable delay costs
    return Math.round(annualDelayed * costPerDelay * 0.68);
  }, [annualDelayed, costPerDelay]);

  const hoursReclaimed = useMemo(() => {
    // 3.5 manual coordination hours saved per prevented delay
    return Math.round(annualDelayed * 0.68 * 3.5);
  }, [annualDelayed]);

  return (
    <section className="roi-calculator-section">
      <div className="roi-header">
        <span className="eyebrow">OPERATIONAL VALUE ENGINE</span>
        <h2>Calculate your annual supply chain savings.</h2>
        <p>Adjust your operational volume to estimate time reclaimed and delay penalties eliminated.</p>
      </div>

      <div className="roi-grid">
        {/* Controls */}
        <div className="roi-controls-card">
          <div className="roi-slider-group">
            <div className="roi-slider-label">
              <span>Monthly shipments</span>
              <strong>{monthlyShipments.toLocaleString()} units</strong>
            </div>
            <input
              type="range"
              min="200"
              max="25000"
              step="100"
              value={monthlyShipments}
              onChange={(e) => setMonthlyShipments(Number(e.target.value))}
              className="roi-slider"
            />
          </div>

          <div className="roi-slider-group">
            <div className="roi-slider-label">
              <span>Average delay / exception rate</span>
              <strong>{delayPercent}%</strong>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              step="1"
              value={delayPercent}
              onChange={(e) => setDelayPercent(Number(e.target.value))}
              className="roi-slider"
            />
          </div>

          <div className="roi-slider-group">
            <div className="roi-slider-label">
              <span>Est. penalty / resolution cost per exception</span>
              <strong>${costPerDelay}</strong>
            </div>
            <input
              type="range"
              min="50"
              max="1000"
              step="25"
              value={costPerDelay}
              onChange={(e) => setCostPerDelay(Number(e.target.value))}
              className="roi-slider"
            />
          </div>
        </div>

        {/* Dynamic Results */}
        <div className="roi-results-card">
          <div className="roi-result-item roi-highlight">
            <span className="roi-result-tag">Estimated Annual Cost Savings</span>
            <strong className="roi-big-number">${projectedSavedDollars.toLocaleString()}</strong>
            <small>Based on a 68% reduction in carrier bottlenecks and manual follow-ups</small>
          </div>

          <div className="roi-sub-results">
            <div className="roi-sub-box">
              <span>Hours Reclaimed / Year</span>
              <strong>{hoursReclaimed.toLocaleString()} hrs</strong>
              <small>Auto-generated status transitions</small>
            </div>
            <div className="roi-sub-box">
              <span>Avg Delay Resolution</span>
              <strong>24 mins</strong>
              <small>Down from 4.8 business hours</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Interactive Workflow Showcase ───────────────────────────────────── */
const SHOWCASE_TABS = [
  {
    id: "orders",
    title: "1. Purchase Orders",
    icon: "▤",
    desc: "Collaborative multi-stage status lifecycle from draft to supplier confirmation with audit trail.",
    preview: {
      type: "order",
      id: "PO-78401",
      supplier: "Atlas Components",
      items: "50x Temperature Sensor · 12x Industrial Cable",
      steps: ["Draft", "Submitted", "Approved", "Confirmed"],
      activeStep: 3
    }
  },
  {
    id: "route",
    title: "2. Intelligent Routing",
    icon: "⌖",
    desc: "Deterministic shortest path calculation and carrier freight estimation before dispatch.",
    preview: {
      type: "routing",
      origin: "Central Hub",
      destination: "South Port",
      optimalPath: "Central Hub → North Warehouse → South Port",
      distance: "51 distance units",
      efficiency: "+18.4% faster than direct bypass"
    }
  },
  {
    id: "inventory",
    title: "3. Low-Stock Intelligence",
    icon: "▣",
    desc: "Autonomous reorder signals and warehouse threshold monitors across all linked facilities.",
    preview: {
      type: "inventory",
      product: "Stainless Fastener DEMO-BOLT-001",
      warehouse: "Northstar Main Warehouse",
      current: 7,
      reorderPoint: 30,
      deficit: 23
    }
  }
];

function InteractiveFeatureShowcase() {
  const [activeTabId, setActiveTabId] = useState("orders");
  const tab = SHOWCASE_TABS.find((t) => t.id === activeTabId) || SHOWCASE_TABS[0];

  return (
    <section className="interactive-showcase-section">
      <div className="section-heading">
        <span className="eyebrow">STEP-BY-STEP WORKFLOWS</span>
        <h2>Designed for how modern teams operate.</h2>
      </div>

      <div className="showcase-nav-row">
        {SHOWCASE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`showcase-tab-btn ${activeTabId === t.id ? "showcase-tab-active" : ""}`}
            onClick={() => setActiveTabId(t.id)}
          >
            <span aria-hidden="true">{t.icon}</span> {t.title}
          </button>
        ))}
      </div>

      <div className="showcase-display-card">
        <div className="showcase-info">
          <h3>{tab.title}</h3>
          <p>{tab.desc}</p>
          <div className="showcase-badge">
            <span className="showcase-badge-dot" /> Live interactive preview
          </div>
        </div>

        <div className="showcase-preview-frame">
          {tab.preview.type === "order" && (
            <div className="preview-po-card">
              <div className="preview-po-top">
                <strong>{tab.preview.id}</strong>
                <span className="status-pill status-confirmed">Confirmed</span>
              </div>
              <p className="preview-po-sub">{tab.preview.supplier} · {tab.preview.items}</p>
              <div className="preview-stepper">
                {tab.preview.steps.map((st, i) => (
                  <div key={st} className={`stepper-step ${i <= tab.preview.activeStep ? "stepper-done" : ""}`}>
                    <div className="step-circle">{i < tab.preview.activeStep ? "✓" : i + 1}</div>
                    <span>{st}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab.preview.type === "routing" && (
            <div className="preview-route-card">
              <div className="route-header-line">
                <span className="route-badge">Optimized Route Found</span>
                <strong>{tab.preview.distance}</strong>
              </div>
              <div className="route-path-visual">
                <span className="route-stop">📍 {tab.preview.origin}</span>
                <span className="route-arrow">⟶</span>
                <span className="route-stop">🏢 North Warehouse</span>
                <span className="route-arrow">⟶</span>
                <span className="route-stop">⚓ {tab.preview.destination}</span>
              </div>
              <p className="route-metric-note">Estimated transit savings: {tab.preview.efficiency}</p>
            </div>
          )}

          {tab.preview.type === "inventory" && (
            <div className="preview-inventory-card">
              <div className="inventory-preview-header">
                <strong>{tab.preview.product}</strong>
                <span className="status-pill status-delayed">Action Needed</span>
              </div>
              <p className="inventory-preview-wh">{tab.preview.warehouse}</p>
              <div className="inventory-gauge-wrap">
                <div className="inventory-gauge-bar">
                  <div
                    className="inventory-gauge-fill"
                    style={{ width: `${(tab.preview.current / tab.preview.reorderPoint) * 100}%` }}
                  />
                </div>
                <div className="inventory-gauge-labels">
                  <span>Current: <strong>{tab.preview.current} units</strong></span>
                  <span>Threshold: <strong>{tab.preview.reorderPoint} units</strong></span>
                </div>
              </div>
              <div className="inventory-quick-action-row">
                <span>⚠️ Deficit: {tab.preview.deficit} units</span>
                <span className="inventory-sim-btn">Auto-draft PO →</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Interactive FAQ Accordion ───────────────────────────────────────── */
const FAQS = [
  {
    q: "Can suppliers and logistics partners access separate restricted views?",
    a: "Yes. GlobalChain provides strict tenant and role isolation. Suppliers only access orders & shipments where they are designated partners, warehouse managers handle stock receipts, and logistics providers manage dispatch and transit events."
  },
  {
    q: "How does the platform handle disconnected networks or offline evaluations?",
    a: "Our built-in local fallback simulation engine keeps the entire interactive experience, route calculation, and order workflow running in your browser even if backend connectivity is intermittent."
  },
  {
    q: "Can I simulate carrier disruptions and supplier delays before deploying?",
    a: "Absolutely. Our live simulation tools allow you to simulate weather delays, port bottlenecks, and sudden demand spikes to observe automated rerouting and reorder signals in real-time."
  },
  {
    q: "Does GlobalChain integrate with existing ERP systems?",
    a: "Yes. All operational records (Purchase Orders, Shipments, Inventory movements) are accessible via standard REST endpoints and webhook dispatches."
  }
];

function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section className="faq-section">
      <div className="section-heading">
        <span className="eyebrow">COMMON QUESTIONS</span>
        <h2>Everything you need to know.</h2>
      </div>

      <div className="faq-list">
        {FAQS.map((faq, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={faq.q} className={`faq-card ${isOpen ? "faq-card-open" : ""}`}>
              <button
                type="button"
                className="faq-question-btn"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span>{faq.q}</span>
                <span className="faq-arrow">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

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

/* ── Landing Page Main ───────────────────────────────────────────────── */
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
          <button
            className="button button-demo-nav"
            onClick={() => setShowDemo(true)}
            type="button"
          >
            ⚡ Live Demo
          </button>
          <Link className="button button-quiet" to="/login">Sign in</Link>
          <Link className="button button-primary" to="/register">
            Create workspace <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      <main>
        {/* Live Dispatch Ticker */}
        <LiveDispatchStream />

        {/* Hero Section */}
        <section className={`hero ${heroVisible ? "hero-visible" : ""}`}>
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              INTELLIGENT SUPPLY CHAIN PLATFORM
            </div>

            <h1>
              Move your supply chain forward,{" "}
              <TypewriterPhrase />
            </h1>

            <p className="hero-description">
              A real-time operations workspace for manufacturers, suppliers, warehouse
              teams, and logistics providers. Eliminate blind spots with continuous telemetry
              and automated fulfillment coordination.
            </p>

            <div className="hero-metrics">
              {BASE_METRICS.map((m, i) => (
                <MetricTile key={m.id} metric={m} index={i} />
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
                Launch 1-Click Demo <span aria-hidden="true">⚡</span>
              </button>
            </div>

            <div className="hero-actions-secondary">
              <Link className="text-link" to="/login">I already have an account</Link>
            </div>

            <div className="hero-footnote">
              <span className="secure-icon" aria-hidden="true">✓</span>
              Enterprise role segregation · Live interactive simulation · SOC2 compliant
            </div>
          </div>

          <HeroVisual />
        </section>

        {/* Interactive Feature Showcase with Live Tabs */}
        <InteractiveFeatureShowcase />

        {/* Interactive ROI Calculator */}
        <InteractiveRoiCalculator />

        {/* FAQ Accordion */}
        <FaqAccordion />
      </main>

      <footer className="landing-footer">
        <span>GlobalChain <span>·</span> Next-Gen Global Supply Chain Collaboration Platform</span>
        <span>Connected multi-tier operations &amp; live telemetry</span>
      </footer>
    </div>
  );
}
