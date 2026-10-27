import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import { useApiResource } from "../components/ResourceHelpers";
import ThemeToggle from "../components/ThemeToggle";

export default function AcceptInvitationPage() {
  const { token = "" } = useParams();
  const invitation = useApiResource(`/auth/invitations/${encodeURIComponent(token)}`);
  const [form, setForm] = useState({ fullName: "", password: "" });
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function accept(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post(`/auth/invitations/${encodeURIComponent(token)}/accept`, form);
      setAccepted(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Could not accept this invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  const details = invitation.data?.invitation;
  return (
    <main className="auth-page">
      <div className="auth-header"><Link className="brand auth-brand" to="/"><span className="brand-mark">G</span><span>Global<span className="brand-light">Chain</span></span></Link><ThemeToggle /></div>
      <section className="auth-card">
        <div className="eyebrow">JOIN AN ORGANIZATION</div>
        {invitation.loading && <><h1>Checking invitation…</h1><p className="auth-intro">Verifying the invitation link.</p></>}
        {invitation.error && <><h1>Invitation unavailable</h1><div className="form-error" role="alert">{invitation.error}</div><p className="auth-switch"><Link to="/register">Create a separate workspace</Link></p></>}
        {details && !accepted && <>
          <h1>Join {details.organizationName}</h1>
          <p className="auth-intro">Create your account as a {details.role.replaceAll("_", " ")} using the invited email address {details.email}.</p>
          <form onSubmit={accept}>
            <label htmlFor="invite-full-name">Your name</label>
            <input id="invite-full-name" autoComplete="name" minLength="2" maxLength="100" required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
            <label htmlFor="invite-password">Create a password</label>
            <input id="invite-password" type="password" autoComplete="new-password" minLength="8" maxLength="72" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary button-full" disabled={submitting}>{submitting ? "Joining organization…" : "Accept invitation"} <span aria-hidden="true">→</span></button>
          </form>
        </>}
        {accepted && <>
          <h1>You’re on the team</h1>
          <p className="auth-intro">Your account is ready. Sign in to open the {details?.organizationName} workspace.</p>
          <Link className="button button-primary button-full" to="/login">Continue to sign in</Link>
        </>}
      </section>
      <p className="auth-footer">Your organization, connected.</p>
    </main>
  );
}
