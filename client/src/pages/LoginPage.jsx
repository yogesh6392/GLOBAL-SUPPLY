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

  return (
    <main className="auth-page">
      <div className="auth-header"><Link className="brand auth-brand" to="/"><span className="brand-mark">G</span><span>Global<span className="brand-light">Chain</span></span></Link><ThemeToggle /></div>
      <section className="auth-card">
        <div className="eyebrow">TEACHER PRESENTATION DEMO</div><h1>Open a sample workspace</h1><p className="auth-intro">No account, server or database is needed. Choose a sample role to explore the workflows.</p>
        <div className="demo-access-panel">
          <strong>Browser-only sample accounts</strong>
          <span>Shared demo password: <code>{DEMO_PASSWORD}</code></span>
          <div className="demo-account-list">
            {DEMO_ACCOUNTS.map((account) => (
              <button className="demo-account-button" type="button" key={account.email} disabled={submitting} onClick={() => openDemoAccount(account)}>
                <span>{account.label}</span><small>{account.email}</small><b aria-hidden="true">→</b>
              </button>
            ))}
          </div>
          <small className="demo-storage-note">Changes are saved only in this browser and reset when its site data is cleared.</small>
        </div>
        <details className="demo-manual-login">
          <summary>Enter demo email and password manually</summary>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Work email</label><input id="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" />
          <label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter your password" />
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary button-full" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"} <span aria-hidden="true">→</span></button>
        </form>
        </details>
        <p className="auth-switch">Need a separate sample workspace? <Link to="/register">Create one in this browser</Link></p>
      </section>
      <p className="auth-footer">Your organization, connected.</p>
    </main>
  );
}
