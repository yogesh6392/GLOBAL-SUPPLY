import { useEffect, useState } from "react";
import api from "../api";
import { DataTable, PageHeader, Notice, SectionCard, useApiResource, useSubmitAction } from "../components/ResourceHelpers";
import { useAuth } from "../AuthContext";

const memberRoles = [
  ["manufacturer", "Manufacturer"],
  ["supplier", "Supplier"],
  ["warehouse_manager", "Warehouse manager"],
  ["logistics_provider", "Logistics provider"]
];

export default function OrganizationPage() {
  const { user, refreshUser } = useAuth();
  const { data, error: loadError, loading, reload } = useApiResource("/organization");
  const [name, setName] = useState("");
  const mayEdit = ["admin", "manufacturer"].includes(user?.role);
  const action = useSubmitAction(async () => {
    await reload();
    await refreshUser();
  });

  useEffect(() => {
    if (data?.organization?.name) setName(data.organization.name);
  }, [data]);

  async function save(event) {
    event.preventDefault();
    await action.submit(() => api.patch("/organization", { name }), "Organization details updated.");
  }

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="ORGANIZATION" title="Organization profile" description="Manage the profile connected to this signed-in account." />
      {loadError && <Notice tone="error">{loadError}</Notice>}
      {action.error && <Notice tone="error">{action.error}</Notice>}
      {action.message && <Notice tone="success">{action.message}</Notice>}
      <SectionCard title="Organization details" description="Accounts are scoped to one organization in this project foundation.">
        {loading ? <p className="muted-copy">Loading organization profile…</p> : (
          <form className="form-grid form-grid-narrow" onSubmit={save}>
            <label htmlFor="org-name">Organization name</label>
            <input id="org-name" value={name} onChange={(event) => setName(event.target.value)} minLength="2" maxLength="120" required disabled={!mayEdit} />
            <p className="field-note">Created {data?.organization?.createdAt ? new Date(data.organization.createdAt).toLocaleDateString() : "—"}. Only administrators and manufacturer accounts can rename this organization.</p>
            {mayEdit && <button className="button button-primary form-submit" disabled={action.submitting}>{action.submitting ? "Saving…" : "Save changes"}</button>}
          </form>
        )}
      </SectionCard>
      {mayEdit && <TeamManagement />}
    </div>
  );
}

function TeamManagement() {
  const members = useApiResource("/organization/members");
  const invitations = useApiResource("/organization/invitations");
  const [form, setForm] = useState({ email: "", role: "supplier" });
  const [invitationUrl, setInvitationUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function createInvitation(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setInvitationUrl("");
    setSaving(true);
    try {
      const { data } = await api.post("/organization/invitations", form);
      setInvitationUrl(data.data.invitation.invitationUrl);
      setForm({ ...form, email: "" });
      setMessage(`Invitation created for ${data.data.invitation.email}. Share this link within the next seven days.`);
      await invitations.reload();
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Could not create team invitation.");
    } finally {
      setSaving(false);
    }
  }

  async function updateMember(member, changes) {
    setError("");
    setMessage("");
    try {
      await api.patch(`/organization/members/${member.id}`, changes);
      setMessage(`${member.fullName}'s team access was updated.`);
      await members.reload();
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Could not update team member.");
    }
  }

  async function revokeInvitation(invitation) {
    setError("");
    setMessage("");
    try {
      await api.delete(`/organization/invitations/${invitation._id}`);
      setMessage(`Invitation for ${invitation.email} was revoked.`);
      await invitations.reload();
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Could not revoke invitation.");
    }
  }

  return (
    <SectionCard title="Team members" description="Invite teammates into this organization and manage their role or access. Invitation links expire after seven days.">
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      <form className="compact-form team-invite-form" onSubmit={createInvitation}>
        <label htmlFor="invite-email">Teammate email</label>
        <input id="invite-email" type="email" autoComplete="email" maxLength="254" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <label htmlFor="invite-role">Organization role</label>
        <select id="invite-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          {memberRoles.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        <button className="button button-primary" disabled={saving}>{saving ? "Creating invitation…" : "Create invitation"}</button>
      </form>
      {invitationUrl && (
        <div className="invitation-link">
          <label htmlFor="invitation-link">Invitation link</label>
          <input id="invitation-link" readOnly value={invitationUrl} onFocus={(event) => event.target.select()} />
        </div>
      )}
      {members.error && <Notice tone="error">{members.error}</Notice>}
      <DataTable emptyMessage={members.loading ? "Loading team members…" : "No organization members yet."} columns={[
        { key: "fullName", label: "Name" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role", render: (member) => member.role === "admin"
          ? "Platform administrator"
          : <select aria-label={`Role for ${member.fullName}`} value={member.role} disabled={!member.active} onChange={(event) => updateMember(member, { role: event.target.value })}>
            {memberRoles.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select> },
        { key: "active", label: "Access", render: (member) => member.role === "admin"
          ? "Administrator"
          : <button className="table-action" onClick={() => updateMember(member, { active: !member.active })}>{member.active ? "Active · Disable" : "Disabled · Enable"}</button> }
      ]} rows={members.data?.members ?? []} />
      {invitations.error && <Notice tone="error">{invitations.error}</Notice>}
      <DataTable emptyMessage={invitations.loading ? "Loading invitations…" : "No pending invitations."} columns={[
        { key: "email", label: "Invited email" },
        { key: "role", label: "Role", render: (invitation) => invitation.role.replaceAll("_", " ") },
        { key: "expiresAt", label: "Expires", render: (invitation) => new Date(invitation.expiresAt).toLocaleString() },
        { key: "actions", label: "Action", render: (invitation) => <button className="table-action danger-action" onClick={() => revokeInvitation(invitation)}>Revoke</button> }
      ]} rows={invitations.data?.invitations ?? []} />
    </SectionCard>
  );
}
