"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallHint() {
  const [show, setShow] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone;
    const dismissed = sessionStorage.getItem("critterops-install-hint") === "1";
    const mobile = window.matchMedia("(max-width: 767px)").matches;

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    setShow(!standalone && !dismissed && mobile);

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!show) return null;

  async function installApp() {
    if (!installEvent) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
      sessionStorage.setItem("critterops-install-hint", "1");
      setShow(false);
    } finally {
      setInstalling(false);
      setInstallEvent(null);
    }
  }

  function dismiss() {
    sessionStorage.setItem("critterops-install-hint", "1");
    setShow(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 overflow-hidden rounded-2xl border border-white/10 bg-forest text-white shadow-lg md:hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,111,26,0.2),transparent_55%)]" />
      <div className="relative px-4 py-3">
        <p className="text-sm font-bold">Use CritterOps like an app</p>
        {installEvent ? (
          <p className="mt-1 text-xs text-white/70">Install on this phone for faster field access.</p>
        ) : (
          <p className="mt-1 text-xs text-white/70">
            On iPhone: Share → Add to Home Screen. On Android: menu → Install app.
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-3">
          {installEvent ? (
            <button
              type="button"
              className="text-xs font-bold text-gold disabled:opacity-60"
              disabled={installing}
              onClick={installApp}
            >
              {installing ? "Installing…" : "Install app"}
            </button>
          ) : null}
          <button type="button" className="text-xs font-semibold text-white/75" onClick={dismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
