"use client";

import { trapQrPayload } from "@/lib/trap-qr";

export function TrapQrHint({ serial }: { serial: string }) {
  const payload = trapQrPayload(serial);
  return (
    <p className="mt-2 text-xs text-stone-500">
      QR label: <code className="rounded bg-background px-1">{payload}</code>
    </p>
  );
}
