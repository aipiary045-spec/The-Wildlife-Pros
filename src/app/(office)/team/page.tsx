import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AddTeamMemberButton } from "@/components/team/AddTeamMemberButton";
import { EditTeamMemberButton } from "@/components/team/EditTeamMemberButton";
import { TeamStatusButton } from "@/components/team/TeamStatusButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getSession } from "@/lib/auth";
import { USER_ROLE_LABEL, USER_STATUS_LABEL } from "@/lib/constants";
import { canManageTeam } from "@/lib/team";
import { formatPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageTeam(session.role)) redirect("/schedule");

  const users = await prisma.user.findMany({
    where: { organizationId: session.organizationId },
    orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  });
  const activeOwnerCount = users.filter((user) => user.role === "OWNER" && user.status === "ACTIVE").length;
  const active = users.filter((user) => user.status !== "DISABLED");
  const disabled = users.filter((user) => user.status === "DISABLED");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Add technicians and office staff. Disable someone to take them off the calendar without deleting their jobs."
        related={[{ href: "/time-off", label: "Time off" }, { href: "/timesheets", label: "Timesheets" }]}
        actions={<AddTeamMemberButton actorRole={session.role} />}
      />
      <MemberList
        title="Active"
        users={active}
        actorId={session.id}
        actorRole={session.role}
        activeOwnerCount={activeOwnerCount}
      />
      {disabled.length > 0 ? (
        <MemberList
          title="Disabled"
          users={disabled}
          actorId={session.id}
          actorRole={session.role}
          activeOwnerCount={activeOwnerCount}
        />
      ) : null}
    </div>
  );
}

function MemberList({
  title,
  users,
  actorId,
  actorRole,
  activeOwnerCount,
}: {
  title: string;
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
    status: string;
    color: string;
    homeAddress: string | null;
  }>;
  actorId: string;
  actorRole: string;
  activeOwnerCount: number;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      <div className="space-y-2 md:hidden">
        {users.map((user) => (
          <article key={user.id} className="rounded-2xl border border-line bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: user.color }}
                >
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </span>
                <div>
                  <p className="font-semibold">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-stone-600">{user.email}</p>
                  <p className="text-xs text-stone-500">
                    {USER_ROLE_LABEL[user.role] ?? user.role}
                    {user.phone ? ` · ${formatPhone(user.phone)}` : ""}
                  </p>
                </div>
              </div>
              <StatusBadge status={user.status} label={USER_STATUS_LABEL[user.status]} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <EditTeamMemberButton actorRole={actorRole} user={user} />
              <TeamStatusButton actorId={actorId} actorRole={actorRole} user={user} activeOwnerCount={activeOwnerCount} />
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-panel md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Login</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: user.color }}
                    >
                      {user.firstName.charAt(0)}
                      {user.lastName.charAt(0)}
                    </span>
                    {user.firstName} {user.lastName}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {user.email}
                  <p className="text-xs text-stone-500">{formatPhone(user.phone)}</p>
                </td>
                <td className="px-4 py-3">{USER_ROLE_LABEL[user.role] ?? user.role}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={user.status} label={USER_STATUS_LABEL[user.status]} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <EditTeamMemberButton actorRole={actorRole} user={user} />
                    <TeamStatusButton actorId={actorId} actorRole={actorRole} user={user} activeOwnerCount={activeOwnerCount} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
