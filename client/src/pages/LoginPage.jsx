import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getApiError } from "../api";
import ThemeToggle from "../components/ThemeToggle";

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

  return (
    <main className="auth-page">
      <div className="auth-header"><Link className="brand auth-brand" to="/"><span className="brand-mark">G</span><span>Global<span className="brand-light">Chain</span></span></Link><ThemeToggle /></div>
      <section className="auth-card">
        <div className="eyebrow">WELCOME BACK</div><h1>Sign in to your workspace</h1><p className="auth-intro">Pick up where your team left off.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Work email</label><input id="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" />
          <label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter your password" />
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary button-full" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"} <span aria-hidden="true">→</span></button>
        </form>
        <p className="auth-switch">New to GlobalChain? <Link to="/register">Create an account</Link></p>
      </section>
      <p className="auth-footer">Your organization, connected.</p>
    </main>
  );
}
