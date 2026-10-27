import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getApiError } from "../api";
import ThemeToggle from "../components/ThemeToggle";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../demoApi";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form);
      navigate("/dashboard");
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function openDemoAccount(account) {
    setError("");
    setSubmitting(true);
    try {
      await login({ email: account.email, password: DEMO_PASSWORD });
      navigate("/dashboard");
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  const fillCredentials = (email, pass) => {
    setForm({ email, password: pass });
    setError("");
  };

  return (
    <main className="auth-page">
      <div className="auth-header">
        <Link className="brand auth-brand" to="/">
          <span className="brand-mark">G</span>
          <span>Global<span className="brand-light">Chain</span></span>
        </Link>
        <ThemeToggle />
      </div>

      <section className="auth-card">
        <div className="eyebrow">CONTROL TOWER ACCESS</div>
        <h1>Sign in to your workspace</h1>
        <p className="auth-intro">Pick up where your team left off, or click any sample role below for instant access.</p>

        {/* 1-Click Evaluation / Demo Accounts */}
        <div className="demo-access-panel">
          <strong>Quick Role Access (1-Click Sign In)</strong>
          <span>Shared test password: <code>{DEMO_PASSWORD}</code></span>
          <div className="demo-account-list">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                className="demo-account-button"
                type="button"
                key={account.email}
                disabled={submitting}
                onClick={() => openDemoAccount(account)}
              >
                <span>{account.label}</span>
                <small>{account.email} · {account.organization}</small>
                <b aria-hidden="true">→</b>
              </button>
            ))}
          </div>
          <small className="demo-storage-note">
            Pre-configured with realistic supplier catalogs, purchase orders, warehouses, stock, shipments & DAA algorithms.
          </small>
        </div>

        {/* Manual Credentials Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
          <label htmlFor="email">Work email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="name@organization.com"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="••••••••"
          />

          {error && <div className="form-error" role="alert">{error}</div>}

          <button className="button button-primary button-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"} <span aria-hidden="true">→</span>
          </button>
        </form>

        <p className="auth-switch">
          New to GlobalChain? <Link to="/register">Create an account</Link>
        </p>
      </section>

      <p className="auth-footer">Your organization, connected.</p>
    </main>
  );
}
