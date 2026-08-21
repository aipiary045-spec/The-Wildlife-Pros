"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { USER_ROLE_LABEL } from "@/lib/constants";
import { rolesActorCanAssign } from "@/lib/team";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";
const COLORS = ["#E85D04", "#F48C06", "#2A9D8F", "#277DA1", "#9B2226", "#6A4C93", "#111111"];

export function AddTeamMemberButton({ actorRole }: { actorRole: string }) {
  const [open, setOpen] = useState(false);
  const roles = rolesActorCanAssign(actorRole);
  if (roles.length === 0) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white sm:w-auto">
        Add team member
      </button>
      {open ? <AddTeamMemberDialog roles={roles} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AddTeamMemberDialog({
  roles,
  onClose,
}: {
  roles: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const defaultRole = roles.includes("TECHNICIAN") ? "TECHNICIAN" : roles[0];
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [color, setColor] = useState(COLORS[0]);
  const [homeAddress, setHomeAddress] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/users", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password,
        phone,
        role,
        color,
        homeAddress,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not add this person.");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-orange">New team member</p>
        <h2 className="mt-1 font-display text-2xl">Add to the crew</h2>
        <p className="mt-2 text-sm text-stone-600">Give them a login. Technicians show up on the calendar; admins can switch to field view when they are on a trapline.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            First name
            <input required value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            Last name
            <input required value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm sm:col-span-2">
            Email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm sm:col-span-2">
            Temporary password
            <input required type="text" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            Role
            <select value={role} onChange={(event) => setRole(event.target.value)} className={inputClass}>
              {roles.map((value) => (
                <option key={value} value={value}>
                  {USER_ROLE_LABEL[value] ?? value}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Phone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm sm:col-span-2">
            Home / shop start (for routing)
            <input value={homeAddress} onChange={(event) => setHomeAddress(event.target.value)} className={inputClass} placeholder="418 Ridge Line Dr" />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm">Calendar color</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLORS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={value}
                  onClick={() => setColor(value)}
                  className="h-8 w-8 rounded-full border-2"
                  style={{ background: value, borderColor: color === value ? "#111111" : "transparent" }}
                />
              ))}
            </div>
          </fieldset>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-orange px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving…" : "Add to team"}
          </button>
        </div>
      </form>
    </div>
  );
}
