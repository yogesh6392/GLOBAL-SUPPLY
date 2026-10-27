import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

const features = [
  ["01", "One connected workspace", "Give manufacturers, suppliers, warehouse teams and logistics partners a shared place to coordinate."],
  ["02", "Operations with context", "Bring procurement, inventory and delivery workflows together as the platform grows."],
  ["03", "Explainable decisions", "Build toward practical optimization with clear assumptions and algorithms you can inspect."]
];

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <a className="brand" href="/"><span className="brand-mark">G</span><span>Global<span className="brand-light">Chain</span></span></a>
        <div className="landing-actions"><ThemeToggle /><Link className="button button-quiet" to="/login">Sign in</Link><Link className="button button-primary" to="/register">Create workspace <span aria-hidden="true">→</span></Link></div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot"></span> SUPPLY CHAIN COLLABORATION</div>
            <h1>Move your supply chain forward, <em>together.</em></h1>
            <p className="hero-description">A shared operations workspace for the people and organizations that keep goods moving—from supplier coordination to the last mile.</p>
            <div className="hero-actions"><Link className="button button-primary button-large" to="/register">Get started <span aria-hidden="true">→</span></Link><Link className="text-link" to="/login">I already have an account</Link></div>
            <div className="hero-footnote"><span className="secure-icon" aria-hidden="true">✓</span> A collaborative workspace for your organization</div>
          </div>
          <div className="hero-visual" aria-label="Illustration of connected supply chain locations">
            <div className="visual-glow"></div>
            <div className="network-line line-one"></div><div className="network-line line-two"></div><div className="network-line line-three"></div>
            <div className="network-node node-hub"><span>◎</span><small>CONTROL TOWER</small></div>
            <div className="network-node node-top"><span>⌂</span><small>SUPPLIER</small></div>
            <div className="network-node node-left"><span>▣</span><small>WAREHOUSE</small></div>
            <div className="network-node node-right"><span>↗</span><small>LOGISTICS</small></div>
            <div className="visual-caption"><span className="caption-pulse"></span> A clearer view starts here</div>
          </div>
        </section>
        <section className="feature-section">
          <div className="section-heading"><span className="eyebrow">BUILT FOR COORDINATION</span><h2>Complex operations.<br /><span>One shared view.</span></h2></div>
          <div className="feature-grid">{features.map(([number, title, description]) => <article className="feature-card" key={number}><span className="feature-number">{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
        </section>
      </main>
      <footer className="landing-footer"><span>GlobalChain <span>·</span> Intelligent Global Supply Chain Collaboration Platform</span><span>College project demonstration</span></footer>
    </div>
  );
}
