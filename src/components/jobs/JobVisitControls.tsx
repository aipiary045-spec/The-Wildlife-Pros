"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NavigateLink } from "@/components/maps/NavigateLink";
import { TrapQrScanner } from "@/components/jobs/TrapQrScanner";
import { DISPOSITION_LABEL } from "@/lib/constants";
import { readCaptureDefaults, writeCaptureDefaults } from "@/lib/capture-memory";
import { CHECKOUT_WORK, visitActionForStatus, type CheckoutInput } from "@/lib/job-visit";
import { fieldFetch, isQueuedResponse } from "@/lib/field-fetch";
import { visitSummarySmsHref, type VisitSummaryContext } from "@/lib/visit-summary-sms";
import type { ScheduleTech } from "@/components/schedule/job-card";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";
const RETURN_PRESETS = [1, 3, 7, 14];

type CaptureDraft = {
  key: string;
  speciesId: string;
  newSpecies: string;
  quantity: number;
  disposition: string;
  deploymentId: string;
  locationNote: string;
};

export type VisitNextStop = {
  id: string;
  number: string;
  title: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
};

function blankCapture(speciesList: Array<{ id: string }>): CaptureDraft {
  const defaults = readCaptureDefaults();
  const speciesId =
    (defaults.speciesId && speciesList.some((item) => item.id === defaults.speciesId)
      ? defaults.speciesId
      : speciesList[0]?.id) || "__new";
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    speciesId,
    newSpecies: "",
    quantity: 1,
    disposition: defaults.disposition && defaults.disposition in DISPOSITION_LABEL ? defaults.disposition : "RELOCATED",
    deploymentId: "",
    locationNote: "",
  };
}

export function JobVisitControls({
  jobId,
  status,
  compact = false,
  checkedIn = false,
  species = [],
  deployments = [],
  nextStop = null,
  propertyId,
  clientPhone = null,
  visitSummary = null,
}: {
  jobId: string;
  status: string;
  technicianId?: string | null;
  technicians?: ScheduleTech[];
  compact?: boolean;
  checkedIn?: boolean;
  species?: Array<{ id: string; commonName: string }>;
  deployments?: Array<{ id: string; equipment: { serialNumber: string } }>;
  nextStop?: VisitNextStop | null;
  propertyId?: string;
  clientPhone?: string | null;
  visitSummary?: VisitSummaryContext | null;
}) {
  const router = useRouter();
  const photoRef = useRef<HTMLInputElement>(null);
  const [localStatus, setLocalStatus] = useState(checkedIn && visitActionForStatus(status) !== "check-out" ? "ON_SITE" : status);
  const action = visitActionForStatus(localStatus);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openJobConflict, setOpenJobConflict] = useState<{
    id: string;
    number: string;
    title: string;
  } | null>(null);
  const [queuedNote, setQueuedNote] = useState("");
  const [notes, setNotes] = useState("");
  const [workDone, setWorkDone] = useState<string[]>([]);
  const [finishedHere, setFinishedHere] = useState<boolean | null>(null);
  const [returnInDays, setReturnInDays] = useState(3);
  const [trapOpen, setTrapOpen] = useState(false);
  const [trapPlaced, setTrapPlaced] = useState(false);
  const [trapNote, setTrapNote] = useState("");
  const [trapLat, setTrapLat] = useState("");
  const [trapLng, setTrapLng] = useState("");
  const [trapSerial, setTrapSerial] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoHint, setGeoHint] = useState("");
  const [capturesOpen, setCapturesOpen] = useState(false);
  const [captures, setCaptures] = useState<CaptureDraft[]>([]);
  const [exclusionOpen, setExclusionOpen] = useState(false);
  const [exclusionMaterial, setExclusionMaterial] = useState("");
  const [exclusionQuantity, setExclusionQuantity] = useState("");
  const [exclusionNotes, setExclusionNotes] = useState("");
  const [exclusionEntryLabel, setExclusionEntryLabel] = useState("");
  const [exclusionEntryArea, setExclusionEntryArea] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNote, setPhotoNote] = useState("");
  const [doneNext, setDoneNext] = useState<VisitNextStop | null>(null);
  const [notifyCustomerSummary, setNotifyCustomerSummary] = useState(Boolean(clientPhone));
  const [checkoutDone, setCheckoutDone] = useState<{
    title: string;
    lines: string[];
    tone: "success" | "warn";
    smsHref?: string | null;
  } | null>(null);

  const buttonClass = compact
    ? "mt-1 w-full rounded-lg bg-orange px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
    : "min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto";

  useEffect(() => {
    if (checkedIn && visitActionForStatus(status) !== "check-out") {
      setLocalStatus("ON_SITE");
      return;
    }
    setLocalStatus(status);
  }, [status, checkedIn]);

  useEffect(() => {
    if (!open || !trapOpen || !trapPlaced || trapLat || trapLng) return;
    fillMyLocation(true);
  }, [open, trapOpen, trapPlaced, trapLat, trapLng]);

  useEffect(() => {
    setNotifyCustomerSummary(Boolean(clientPhone && visitSummary));
  }, [clientPhone, visitSummary]);

  function buildCheckoutInput(needsReturn: boolean): CheckoutInput {
    const capturePayload = captures
      .map((item) => {
        const speciesId = item.speciesId === "__new" ? undefined : item.speciesId || undefined;
        const speciesName = item.speciesId === "__new" || !item.speciesId ? item.newSpecies.trim() : undefined;
        if (!speciesId && !speciesName) return null;
        return {
          speciesId,
          speciesName,
          quantity: item.quantity,
          disposition: item.disposition,
          deploymentId: item.deploymentId || undefined,
          locationNote: item.locationNote.trim() || undefined,
        };
      })
      .filter(Boolean) as NonNullable<CheckoutInput["captures"]>;
    const exclusion =
      exclusionOpen && exclusionMaterial.trim()
        ? {
            material: exclusionMaterial.trim(),
            quantity: exclusionQuantity.trim() || undefined,
            notes: exclusionNotes.trim() || undefined,
            entryLabel: exclusionEntryLabel.trim() || undefined,
            entryArea: exclusionEntryArea.trim() || undefined,
          }
        : undefined;
    return {
      outcome: needsReturn ? "follow_up" : "complete",
      notes: notes.trim() || undefined,
      workDone,
      trapPlaced,
      trapNote: trapPlaced
        ? [trapSerial.trim() ? `Serial ${trapSerial.trim()}` : "", trapNote.trim()].filter(Boolean).join(" · ") ||
          undefined
        : undefined,
      captures: capturePayload.length ? capturePayload : undefined,
      exclusion,
      followUp: needsReturn
        ? { returnInDays: Number(returnInDays), dueOn: new Date(), notes: notes.trim() || undefined }
        : undefined,
    };
  }

  function visitSummaryMessageLines(wantedSms: boolean, summaryHref: string | null, queued: boolean) {
    if (!wantedSms) return [];
    if (!summaryHref) return ["Could not open Messages — check the customer's phone number."];
    if (queued) {
      return [
        "Messages opened with your visit summary draft.",
        "Edit and send when you're ready. Check-out uploads when this phone has data.",
      ];
    }
    return ["Messages opened with your visit summary — edit and send when you're ready."];
  }

  function openVisitSummaryMessages(href: string) {
    window.location.href = href;
  }

  function resetCheckoutForm() {
    setNotes("");
    setWorkDone([]);
    setFinishedHere(null);
    setReturnInDays(3);
    setTrapOpen(false);
    setTrapPlaced(false);
    setTrapNote("");
    setTrapLat("");
    setTrapLng("");
    setTrapSerial("");
    setGeoHint("");
    setCapturesOpen(false);
    setCaptures([]);
    setExclusionOpen(false);
    setExclusionMaterial("");
    setExclusionQuantity("");
    setExclusionNotes("");
    setExclusionEntryLabel("");
    setExclusionEntryArea("");
    setPhotoNote("");
    setNotifyCustomerSummary(Boolean(clientPhone && visitSummary));
    setError("");
  }

  function closeCheckout() {
    setOpen(false);
    resetCheckoutForm();
  }

  function dismissCheckoutDone() {
    setCheckoutDone(null);
    router.refresh();
  }

  if (!action && !doneNext && !checkoutDone) {
    if (!queuedNote) return null;
    return <p className="mt-1 text-xs text-amber-800">{queuedNote}</p>;
  }

  function toggleWork(id: string) {
    setWorkDone((current) => {
      const removing = current.includes(id);
      const next = removing ? current.filter((item) => item !== id) : [...current, id];
      if (!removing) {
        if (id === "capture") {
          setCapturesOpen(true);
          setCaptures((rows) => (rows.length ? rows : [blankCapture(species)]));
        }
        if (id === "trap_set" || id === "trap_check") {
          setTrapOpen(true);
          if (id === "trap_set") setTrapPlaced(true);
        }
        if (id === "exclusion") setExclusionOpen(true);
      }
      return next;
    });
  }

  function updateCapture(key: string, patch: Partial<CaptureDraft>) {
    setCaptures((current) =>
      current.map((item) => {
        if (item.key !== key) return item;
        const next = { ...item, ...patch };
        writeCaptureDefaults({
          speciesId: next.speciesId !== "__new" ? next.speciesId : undefined,
          disposition: next.disposition,
        });
        return next;
      }),
    );
  }

  async function quickPhoto(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setPhotoBusy(true);
    setPhotoNote("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/photos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          propertyId,
          kind: "DURING",
          url: dataUrl,
          caption: "Field visit photo",
        }),
      });
      setPhotoBusy(false);
      if (!response.ok) {
        setPhotoNote("Could not save photo.");
        return;
      }
      setPhotoNote("Photo saved on this job.");
    } catch {
      setPhotoBusy(false);
      setPhotoNote("Could not save photo.");
    }
  }

  async function openVisit() {
    setError("");
    setOpenJobConflict(null);
    setQueuedNote("");
    if (action === "check-out") {
      setOpen(true);
      return;
    }
    setSaving(true);
    const response = await fieldFetch(`/api/jobs/${jobId}/check-in`, { method: "POST" });
    const data = (await response.json()) as {
      error?: string;
      queued?: boolean;
      already?: boolean;
      repaired?: boolean;
      openJob?: { id: string; number: string; title: string } | null;
    };
    setSaving(false);
    if (!response.ok) {
      if (data.openJob?.id) {
        setOpenJobConflict(data.openJob);
        return;
      }
      setError(data.error ?? "Could not check in");
      return;
    }
    setLocalStatus("ON_SITE");
    if (isQueuedResponse(data)) {
      setQueuedNote("Check-in saved on this phone. It uploads when you have data.");
    }
    setOpen(true);
    router.refresh();
  }

  function fillMyLocation(silent = false) {
    if (!navigator.geolocation) {
      if (!silent) setError("This phone is not sharing GPS.");
      else setGeoHint("GPS not available on this phone — enter coordinates manually if you have them.");
      return;
    }
    setGeoBusy(true);
    if (!silent) setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTrapLat(position.coords.latitude.toFixed(6));
        setTrapLng(position.coords.longitude.toFixed(6));
        setGeoBusy(false);
        setGeoHint("Filled from your phone. Edit the numbers if you need to.");
      },
      () => {
        setGeoBusy(false);
        if (!silent) setError("Could not read GPS. You can enter coordinates manually.");
        else setGeoHint("Could not read GPS — enter coordinates manually if you have them.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function sendCheckout() {
    if (finishedHere === null) return;
    setSaving(true);
    setError("");
    setQueuedNote("");
    setCheckoutDone(null);
    const needsReturn = !finishedHere;
    const wantedSms = notifyCustomerSummary && Boolean(clientPhone && visitSummary);
    const checkoutInput = buildCheckoutInput(needsReturn);
    const summaryHref = wantedSms && visitSummary ? visitSummarySmsHref(clientPhone, visitSummary, checkoutInput) : null;
    const capturePayload = checkoutInput.captures ?? [];
    const exclusion = checkoutInput.exclusion;
    const response = await fieldFetch(`/api/jobs/${jobId}/check-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcome: checkoutInput.outcome,
        notes: checkoutInput.notes,
        workDone: checkoutInput.workDone,
        siteLeft: needsReturn ? "needs_return" : "secure",
        returnInDays: needsReturn ? Number(returnInDays) : undefined,
        trapPlaced: checkoutInput.trapPlaced,
        trapLat: trapPlaced && trapLat ? Number(trapLat) : undefined,
        trapLng: trapPlaced && trapLng ? Number(trapLng) : undefined,
        trapNote: checkoutInput.trapNote,
        captures: capturePayload,
        exclusion,
      }),
    });
    const data = (await response.json()) as {
      error?: string;
      queued?: boolean;
    };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not check out");
      return;
    }
    for (const item of captures) {
      if (item.speciesId && item.speciesId !== "__new") {
        writeCaptureDefaults({ speciesId: item.speciesId, disposition: item.disposition });
      } else {
        writeCaptureDefaults({ disposition: item.disposition });
      }
    }
    setOpen(false);
    resetCheckoutForm();
    setLocalStatus("COMPLETED");

    const queued = isQueuedResponse(data);
    const smsLines = visitSummaryMessageLines(wantedSms, summaryHref, queued);
    if (summaryHref) openVisitSummaryMessages(summaryHref);

    const donePayload = {
      title: queued ? "Checked out (saved on phone)" : "Checked out",
      lines: queued
        ? ["Check-out saved on this phone. It uploads when you have data.", ...smsLines]
        : ["You're checked out.", ...smsLines],
      tone: (queued ? "warn" : "success") as "success" | "warn",
      smsHref: summaryHref,
    };

    if (nextStop) {
      if (queued) {
        setQueuedNote("Check-out saved on this phone. It uploads when you have data.");
      }
      setDoneNext(nextStop);
      if (smsLines.length || queued) setCheckoutDone(donePayload);
      return;
    }

    setCheckoutDone(donePayload);
  }

  const canSubmit = finishedHere !== null;

  const checkoutDoneDialog = checkoutDone ? (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40 sm:items-center sm:justify-center sm:p-3">
      <button type="button" aria-label="Dismiss" className="min-h-0 flex-1 sm:absolute sm:inset-0 sm:flex-none" onClick={dismissCheckoutDone} />
      <div
        role="dialog"
        aria-labelledby="checkout-done-title"
        className={`relative z-10 w-full rounded-t-2xl border bg-panel p-5 shadow-xl sm:max-w-md sm:rounded-2xl ${
          checkoutDone.tone === "success" ? "border-emerald-200" : "border-amber-200"
        }`}
      >
        <p
          className={`text-xs font-bold uppercase tracking-widest ${
            checkoutDone.tone === "success" ? "text-emerald-700" : "text-amber-800"
          }`}
        >
          {checkoutDone.tone === "success" ? "Done" : "Saved on phone"}
        </p>
        <h2 id="checkout-done-title" className="mt-1 font-display text-2xl">
          {checkoutDone.title}
        </h2>
        <div className="mt-3 space-y-2 text-sm text-stone-700">
          {checkoutDone.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {checkoutDone.smsHref ? (
            <button
              type="button"
              onClick={() => openVisitSummaryMessages(checkoutDone.smsHref!)}
              className="min-h-11 w-full rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white"
            >
              Open Messages again
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismissCheckoutDone}
            className="min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (doneNext) {
    return (
      <>
      <div
        className="mt-2 rounded-xl border border-orange/40 bg-orange/10 p-3"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-orange">Next stop</p>
        <p className="mt-1 text-sm font-semibold">{doneNext.number} · {doneNext.title}</p>
        <p className="text-xs text-stone-600">{doneNext.address}</p>
        <div className="mt-3 flex gap-2">
          <NavigateLink
            destination={{ address: doneNext.address, lat: doneNext.lat, lng: doneNext.lng }}
            label="Navigate"
            className="flex-1 [&>a]:w-full [&>a]:justify-center"
          />
          <Link
            href={`/jobs/${doneNext.id}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-orange px-3 text-sm font-semibold text-white"
            onClick={() => {
              setDoneNext(null);
              router.refresh();
            }}
          >
            Open & check in
          </Link>
        </div>
        <button
          type="button"
          className="mt-2 w-full text-center text-xs font-semibold text-stone-500"
          onClick={() => {
            setDoneNext(null);
            router.refresh();
          }}
        >
          Dismiss
        </button>
        {queuedNote ? <p className="mt-2 text-xs text-amber-800">{queuedNote}</p> : null}
      </div>
      {checkoutDoneDialog}
      </>
    );
  }

  if (!action && !doneNext && checkoutDone) {
    return checkoutDoneDialog;
  }

  return (
    <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <button id="check-in" type="button" disabled={saving} className={buttonClass} onClick={() => void openVisit()}>
        {saving ? "Checking in…" : action === "check-out" ? "On site" : "Check in"}
      </button>
      {error && !open ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
      {queuedNote && !open ? <p className="mt-1 text-xs text-amber-800">{queuedNote}</p> : null}
      {checkoutDoneDialog}

      {openJobConflict ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:items-center sm:justify-center sm:p-3">
          <button
            type="button"
            aria-label="Dismiss"
            className="min-h-0 flex-1 sm:absolute sm:inset-0 sm:flex-none"
            onClick={() => setOpenJobConflict(null)}
          />
          <div
            role="dialog"
            aria-labelledby="open-job-conflict-title"
            className="relative z-10 w-full rounded-t-2xl border border-line bg-panel p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-orange">Still checked in</p>
            <h2 id="open-job-conflict-title" className="mt-1 font-display text-2xl">
              Finish the job you&apos;re on first
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              You&apos;re already checked in at another stop. Check out there before starting this one.
            </p>
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{openJobConflict.number}</p>
              <p className="mt-0.5 font-semibold text-emerald-950">{openJobConflict.title}</p>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/jobs/${openJobConflict.id}`}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-orange px-4 text-sm font-semibold text-white"
              >
                Open that job
              </Link>
              <button
                type="button"
                onClick={() => setOpenJobConflict(null)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:justify-center sm:p-3">
          <button type="button" aria-label="Close" className="min-h-0 flex-1 sm:hidden" onClick={closeCheckout} />
          <form
            className="flex max-h-[min(92dvh,720px)] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-panel shadow-xl sm:mx-auto sm:max-w-lg sm:rounded-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              void sendCheckout();
            }}
          >
            <div className="flex-1 overflow-y-auto px-5 pb-4 pt-5">
              <p className="text-xs font-bold uppercase tracking-widest text-orange">Check in</p>
              <h2 className="mt-1 font-display text-2xl">On this job</h2>
              <p className="mt-1 text-sm text-stone-600">
                Log captures, traps, or exclusion if you need to, then check out when you leave.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFinishedHere(true)}
                  className={`min-h-14 rounded-xl border px-3 py-3 text-left text-sm font-semibold ${
                    finishedHere === true ? "border-orange bg-orange/10 text-ink" : "border-line bg-white text-stone-700"
                  }`}
                >
                  Finished here
                  <span className="mt-0.5 block text-xs font-normal text-stone-500">No return trip needed</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFinishedHere(false)}
                  className={`min-h-14 rounded-xl border px-3 py-3 text-left text-sm font-semibold ${
                    finishedHere === false ? "border-orange bg-orange/10 text-ink" : "border-line bg-white text-stone-700"
                  }`}
                >
                  Need another visit
                  <span className="mt-0.5 block text-xs font-normal text-stone-500">Goes to needs-scheduled</span>
                </button>
              </div>

              {finishedHere === false ? (
                <div className="mt-4">
                  <p className="text-sm font-medium">About when to come back</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RETURN_PRESETS.map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setReturnInDays(days)}
                        className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                          returnInDays === days ? "bg-orange text-white" : "border border-line bg-white text-stone-700"
                        }`}
                      >
                        {days === 1 ? "Tomorrow" : `${days} days`}
                      </button>
                    ))}
                  </div>
                  <label className="mt-2 block text-sm">
                    Or enter days
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={returnInDays}
                      onChange={(event) => setReturnInDays(Number(event.target.value))}
                      className={inputClass}
                    />
                  </label>
                </div>
              ) : null}

              {finishedHere !== null && clientPhone && visitSummary ? (
                <label className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-orange/5 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={notifyCustomerSummary}
                    onChange={(event) => setNotifyCustomerSummary(event.target.checked)}
                  />
                  <span>
                    Open Messages with visit summary
                    <span className="mt-0.5 block text-xs font-normal text-stone-500">
                      Prefills a text from what you logged — you edit and send it yourself.
                    </span>
                  </span>
                </label>
              ) : null}

              {finishedHere !== null ? (
                <div className="mt-4">
                  <p className="text-sm font-medium">What did you do? (optional)</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CHECKOUT_WORK.map((option) => {
                      const selected = workDone.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleWork(option.id)}
                          className={`rounded-full px-3 py-1.5 text-sm ${
                            selected ? "bg-ink text-white" : "border border-line bg-white text-stone-700"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <label className="mt-4 block text-sm">
                Notes (optional)
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                  placeholder="Anything dispatch or the next tech should know"
                  className={inputClass}
                />
              </label>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    void quickPhoto(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={() => photoRef.current?.click()}
                  className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {photoBusy ? "Saving photo…" : "Quick photo"}
                </button>
                {photoNote ? <span className="text-xs text-stone-600">{photoNote}</span> : null}
              </div>

              <div className="mt-4 rounded-xl border border-line bg-background/60">
                <button
                  type="button"
                  onClick={() => {
                    const next = !capturesOpen;
                    setCapturesOpen(next);
                    if (next && captures.length === 0) {
                      setCaptures([blankCapture(species)]);
                      if (!workDone.includes("capture")) setWorkDone((current) => [...current, "capture"]);
                    }
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
                >
                  Animals captured
                  <span className="text-xs font-normal text-stone-500">
                    {captures.length ? `${captures.length} logged` : capturesOpen ? "Hide" : "Add"}
                  </span>
                </button>
                {capturesOpen ? (
                  <div className="space-y-4 border-t border-line px-4 pb-4 pt-3">
                    {captures.map((capture, index) => (
                      <div key={capture.key} className="space-y-2 rounded-lg border border-line bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Capture {index + 1}</p>
                          {captures.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => setCaptures((current) => current.filter((item) => item.key !== capture.key))}
                              className="text-xs font-semibold text-rose-700"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <label className="block text-sm">
                          Species
                          <select
                            value={capture.speciesId}
                            onChange={(event) => updateCapture(capture.key, { speciesId: event.target.value })}
                            className={inputClass}
                          >
                            <option value="__new">Type a new species…</option>
                            {species.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.commonName}
                              </option>
                            ))}
                          </select>
                        </label>
                        {capture.speciesId === "__new" || species.length === 0 ? (
                          <label className="block text-sm">
                            Species name
                            <input
                              value={capture.newSpecies}
                              onChange={(event) => updateCapture(capture.key, { newSpecies: event.target.value })}
                              className={inputClass}
                              placeholder="Gray squirrel"
                            />
                          </label>
                        ) : null}
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block text-sm">
                            Qty
                            <input
                              type="number"
                              min={1}
                              value={capture.quantity}
                              onChange={(event) =>
                                updateCapture(capture.key, { quantity: Math.max(1, Number(event.target.value) || 1) })
                              }
                              className={inputClass}
                            />
                          </label>
                          <label className="block text-sm">
                            Disposition
                            <select
                              value={capture.disposition}
                              onChange={(event) => updateCapture(capture.key, { disposition: event.target.value })}
                              className={inputClass}
                            >
                              {Object.entries(DISPOSITION_LABEL).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {deployments.length ? (
                          <label className="block text-sm">
                            Trap (optional)
                            <select
                              value={capture.deploymentId}
                              onChange={(event) => updateCapture(capture.key, { deploymentId: event.target.value })}
                              className={inputClass}
                            >
                              <option value="">Not tied to a serial</option>
                              {deployments.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.equipment.serialNumber}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        <label className="block text-sm">
                          Where
                          <input
                            value={capture.locationNote}
                            onChange={(event) => updateCapture(capture.key, { locationNote: event.target.value })}
                            className={inputClass}
                            placeholder="Attic chase, south rafter"
                          />
                        </label>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCaptures((current) => [...current, blankCapture(species)])}
                      className="text-sm font-semibold text-orange"
                    >
                      + Another capture
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 rounded-xl border border-line bg-background/60">
                <button
                  type="button"
                  onClick={() => {
                    const next = !trapOpen;
                    setTrapOpen(next);
                    if (next) {
                      setTrapPlaced(true);
                    } else {
                      setTrapPlaced(false);
                      setTrapNote("");
                      setTrapLat("");
                      setTrapLng("");
                      setTrapSerial("");
                      setGeoHint("");
                    }
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
                >
                  Trap placed on site
                  <span className="text-xs font-normal text-stone-500">{trapOpen ? "Hide" : "Add"}</span>
                </button>
                {trapOpen ? (
                  <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={trapPlaced}
                        onChange={(event) => {
                          setTrapPlaced(event.target.checked);
                          if (event.target.checked && !trapLat && !trapLng) fillMyLocation(true);
                        }}
                      />
                      Log a trap on this visit
                    </label>
                    {trapPlaced ? (
                      <>
                        <div className="flex flex-wrap items-end gap-2">
                          <label className="block min-w-0 flex-1 text-sm">
                            Serial (optional)
                            <input
                              value={trapSerial}
                              onChange={(event) => setTrapSerial(event.target.value)}
                              className={inputClass}
                              placeholder="T-014"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setScanOpen(true)}
                            className="mb-0.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold"
                          >
                            Scan
                          </button>
                        </div>
                        <label className="block text-sm">
                          Where (description)
                          <input
                            value={trapNote}
                            onChange={(event) => setTrapNote(event.target.value)}
                            className={inputClass}
                            placeholder="South eave, behind the HVAC"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block text-sm">
                            Latitude
                            <input
                              value={trapLat}
                              onChange={(event) => setTrapLat(event.target.value)}
                              className={inputClass}
                              placeholder="35.227086"
                              inputMode="decimal"
                            />
                          </label>
                          <label className="block text-sm">
                            Longitude
                            <input
                              value={trapLng}
                              onChange={(event) => setTrapLng(event.target.value)}
                              className={inputClass}
                              placeholder="-80.843127"
                              inputMode="decimal"
                            />
                          </label>
                        </div>
                        {geoHint ? <p className="text-xs text-stone-500">{geoHint}</p> : null}
                        <button type="button" onClick={() => fillMyLocation()} className="text-sm font-semibold text-orange">
                          {geoBusy ? "Reading GPS…" : "Refresh GPS"}
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 rounded-xl border border-line bg-background/60">
                <button
                  type="button"
                  onClick={() => {
                    const next = !exclusionOpen;
                    setExclusionOpen(next);
                    if (next && !workDone.includes("exclusion")) {
                      setWorkDone((current) => [...current, "exclusion"]);
                    }
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
                >
                  Exclusion / sealing
                  <span className="text-xs font-normal text-stone-500">{exclusionOpen ? "Hide" : "Add"}</span>
                </button>
                {exclusionOpen ? (
                  <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
                    <label className="block text-sm">
                      Material used
                      <input
                        value={exclusionMaterial}
                        onChange={(event) => setExclusionMaterial(event.target.value)}
                        className={inputClass}
                        placeholder="Hardware cloth, foam, flashing…"
                      />
                    </label>
                    <label className="block text-sm">
                      Quantity (optional)
                      <input
                        value={exclusionQuantity}
                        onChange={(event) => setExclusionQuantity(event.target.value)}
                        className={inputClass}
                        placeholder="2 sheets"
                      />
                    </label>
                    <label className="block text-sm">
                      Entry point label (optional)
                      <input
                        value={exclusionEntryLabel}
                        onChange={(event) => setExclusionEntryLabel(event.target.value)}
                        className={inputClass}
                        placeholder="Roof ridge vent"
                      />
                    </label>
                    <label className="block text-sm">
                      Area (optional)
                      <input
                        value={exclusionEntryArea}
                        onChange={(event) => setExclusionEntryArea(event.target.value)}
                        className={inputClass}
                        placeholder="South roof"
                      />
                    </label>
                    <label className="block text-sm">
                      Notes (optional)
                      <input
                        value={exclusionNotes}
                        onChange={(event) => setExclusionNotes(event.target.value)}
                        className={inputClass}
                        placeholder="Sealed and painted to match"
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-line bg-panel px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={closeCheckout} className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold">
                Keep working
              </button>
              <button
                type="submit"
                disabled={saving || !canSubmit}
                className="flex-1 rounded-lg bg-orange px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : finishedHere === false ? "Check out & schedule" : "Check out"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <TrapQrScanner
        open={scanOpen}
        serials={deployments.map((item) => item.equipment.serialNumber)}
        allowUnknown
        onClose={() => setScanOpen(false)}
        onScan={(serial) => {
          setTrapSerial(serial);
          setTrapPlaced(true);
          setTrapOpen(true);
        }}
      />
    </div>
  );
}
