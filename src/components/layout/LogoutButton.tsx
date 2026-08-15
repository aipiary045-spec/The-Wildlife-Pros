"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-panel px-4 text-left text-base font-medium"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-200 text-ink">
        <LogOut size={18} />
      </span>
      Sign out
    </button>
  );
}
