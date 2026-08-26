"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CollapsibleJobSection } from "@/components/jobs/CollapsibleJobSection";
import { groupPhotoPairs } from "@/lib/photo-pairs";

const PHOTO_KINDS = ["BEFORE", "AFTER", "DURING", "DAMAGE", "ENTRY_POINT", "CAPTURE", "OTHER"] as const;

type PhotoRow = {
  id: string;
  kind: string;
  url: string;
  caption: string | null;
  entryPoint: { label: string } | null;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.readAsDataURL(file);
  });
}

async function resizeDataUrl(dataUrl: string, maxEdge = 1200): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) return dataUrl;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Invalid image"));
    img.src = dataUrl;
  });
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  if (scale >= 1) return dataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function PhotoTile({ photo, label }: { photo: PhotoRow; label?: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={photo.caption ?? photo.kind} className="h-36 w-full object-cover" />
      <figcaption className="px-3 py-2 text-xs">
        {label ?? photo.kind.replace(/_/g, " ").toLowerCase()}
        {photo.entryPoint ? ` · ${photo.entryPoint.label}` : ""}
        {photo.caption ? ` · ${photo.caption}` : ""}
      </figcaption>
    </figure>
  );
}

export function JobPhotosCard({
  jobId,
  propertyId,
  photos,
  entryPoints,
}: {
  jobId: string;
  propertyId: string;
  photos: PhotoRow[];
  entryPoints: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<(typeof PHOTO_KINDS)[number]>("BEFORE");
  const [entryPointId, setEntryPointId] = useState(entryPoints[0]?.id ?? "");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { pairs, other } = groupPhotoPairs(photos);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pick a photo file.");
      return;
    }
    if (file.size > 8_000_000) {
      setError("Photo is too large — try another shot.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const dataUrl = await resizeDataUrl(await readFileAsDataUrl(file));
      const response = await fetch("/api/photos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          propertyId,
          entryPointId: entryPointId || undefined,
          kind,
          caption: caption.trim() || undefined,
          url: dataUrl,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save photo.");
        return;
      }
      setCaption("");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not save photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <CollapsibleJobSection
      title="Photo documentation"
      collapsedHint={photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"}` : undefined}
      defaultOpen={photos.length > 0}
    >

      {pairs.length > 0 ? (
        <div className="mb-4 space-y-4">
          <p className="text-sm font-medium">Before / after pairs</p>
          {pairs.map((pair) => (
            <div key={pair.key} className="rounded-xl border border-line bg-background p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{pair.label}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {pair.before ? (
                  <PhotoTile photo={pair.before} label="Before" />
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-line text-xs text-stone-500">
                    Before not uploaded
                  </div>
                )}
                {pair.after ? (
                  <PhotoTile photo={pair.after} label="After" />
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-line text-xs text-stone-500">
                    After not uploaded
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {other.length > 0 ? (
        <div className="mb-4">
          {pairs.length > 0 ? <p className="mb-2 text-sm font-medium">Other photos</p> : null}
          <div className="grid gap-3 sm:grid-cols-3">
            {other.map((photo) => (
              <PhotoTile key={photo.id} photo={photo} />
            ))}
          </div>
        </div>
      ) : null}

      {photos.length === 0 ? <p className="text-sm text-stone-500">No photos yet.</p> : null}

      <div className="mt-4 space-y-3 border-t border-line pt-4">
        <p className="text-sm font-medium">Add photo</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Type
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as (typeof PHOTO_KINDS)[number])}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            >
              {PHOTO_KINDS.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          {entryPoints.length > 0 ? (
            <label className="block text-sm">
              Entry point
              <select
                value={entryPointId}
                onChange={(event) => setEntryPointId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
              >
                <option value="">Not tied to one spot</option>
                {entryPoints.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <label className="block text-sm">
          Caption
          <input
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            placeholder="Before mesh install"
          />
        </label>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Take or choose photo"}
        </button>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>
    </CollapsibleJobSection>
  );
}
