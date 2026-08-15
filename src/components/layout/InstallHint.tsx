"use client";

import { useEffect, useState } from "react";

export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    const dismissed = sessionStorage.getItem("critterops-install-hint") === "1";
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    setShow(!standalone && !dismissed && mobile);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 rounded-2xl border border-line bg-ink px-4 py-3 text-white shadow-lg md:hidden">
      <p className="text-sm font-semibold">Use CritterOps like an app</p>
      <p className="mt-1 text-xs text-white/70">
        On iPhone: Share → Add to Home Screen. On Android: menu → Install app.
      </p>
      <button
        type="button"
        className="mt-2 text-xs font-semibold text-gold"
        onClick={() => {
          sessionStorage.setItem("critterops-install-hint", "1");
          setShow(false);
        }}
      >
        Got it
      </button>
    </div>
  );
}
