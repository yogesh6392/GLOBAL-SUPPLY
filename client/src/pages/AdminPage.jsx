import { useAuth } from "../AuthContext";
import {
  DataTable,
  Notice,
  PageHeader,
  SectionCard,
  useApiResource
} from "../components/ResourceHelpers";

export default function AdminPage() {
  const { user } = useAuth();
  const users = useApiResource(user?.role === "admin" ? "/admin/users" : "/admin/users");
  if (user?.role !== "admin") {
    return <div className="workspace-page"><PageHeader eyebrow="ACCESS CONTROL" title="Administration" description="This area is restricted to platform administrators." /><Notice tone="error">Administrator permissions are required for platform user management.</Notice></div>;
  }

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="PLATFORM ADMINISTRATION" title="Account management" description="Review registered accounts and the organization to which each account belongs." />
      {users.error && <Notice tone="error">{users.error}</Notice>}
      <SectionCard title="Registered users" description={`Showing at most ${users.data?.limit ?? 250} records. Administrator accounts must be provisioned with the protected setup command.`}>
        <DataTable emptyMessage={users.loading ? "Loading accounts…" : "No registered users yet."} columns={[
          { key: "fullName", label: "Name" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role", render: (record) => record.role.replaceAll("_", " ") },
          { key: "organization", label: "Organization" },
          { key: "createdAt", label: "Joined", render: (record) => new Date(record.createdAt).toLocaleDateString() }
        ]} rows={users.data?.users ?? []} />
      </SectionCard>
    </div>
  );
}
