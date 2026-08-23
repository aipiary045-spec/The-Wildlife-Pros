"use client";

import { useEffect, useRef, useState } from "react";
import { parseTrapScan } from "@/lib/trap-qr";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

export function TrapQrScanner({
  open,
  serials,
  onClose,
  onScan,
  allowUnknown = false,
}: {
  open: boolean;
  serials: string[];
  onClose: () => void;
  onScan: (serial: string) => void;
  /** When true, accept any T-### / QR payload even if not in the inventory list. */
  allowUnknown?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState("");
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    setManual("");
    setError("");
    setCameraReady(false);
    let stream: MediaStream | null = null;
    let frame = 0;
    let cancelled = false;

    async function start() {
      if (!("BarcodeDetector" in window)) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        const detector = new window.BarcodeDetector!({
          formats: ["qr_code", "code_128", "code_39", "codabar", "ean_13"],
        });
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes[0]?.rawValue;
            if (raw) {
              const serial = parseTrapScan(raw);
              if (serial) {
                onScan(serial);
                onClose();
                return;
              }
              setError("That code is not a trap serial.");
            }
          } catch {
            // camera frame not ready yet
          }
          frame = window.requestAnimationFrame(() => void tick());
        };
        frame = window.requestAnimationFrame(() => void tick());
      } catch {
        setError("Camera access is off. Type the serial below.");
      }
    }

    void start();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open, onClose, onScan]);

  if (!open) return null;

  function submitManual(event: React.FormEvent) {
    event.preventDefault();
    const serial = parseTrapScan(manual);
    if (!serial) {
      setError("Enter a serial like T-014 or scan a trap QR.");
      return;
    }
    if (!allowUnknown && !serials.some((item) => item.toUpperCase() === serial)) {
      setError(`No trap ${serial} in inventory. Add it first or pick from the list.`);
      return;
    }
    onScan(serial);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-xl">
        <h2 className="font-display text-xl">Scan trap QR</h2>
        <p className="mt-1 text-sm text-stone-600">Point at the label on the cage, or type the serial.</p>
        <div className="mt-3 overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted />
        </div>
        {!cameraReady && !error ? <p className="mt-2 text-xs text-stone-500">Starting camera…</p> : null}
        <form onSubmit={submitManual} className="mt-3 space-y-2">
          <input
            value={manual}
            onChange={(event) => setManual(event.target.value.toUpperCase())}
            placeholder="T-014"
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
          />
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-line px-3 py-2 text-sm font-semibold">
              Cancel
            </button>
            <button type="submit" className="flex-1 rounded-lg bg-orange px-3 py-2 text-sm font-semibold text-white">
              Use serial
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
