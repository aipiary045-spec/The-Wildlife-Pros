"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { NavigateLink } from "@/components/maps/NavigateLink";

type TechOption = {
  id: string;
  firstName: string;
  lastName: string;
  homeLat: number | null;
  homeLng: number | null;
};

type PlanStop = {
  id: string;
  jobId: string;
  sequence: number;
  title: string;
  number?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  clientName?: string;
  milesFromPrev: number;
  driveMinFromPrev: number;
  durationMin: number;
  eta: string;
  scheduledStart: string;
};

type PlanAssignment = {
  technicianId: string;
  technician: { id: string; firstName: string; lastName: string };
  stops: PlanStop[];
  totalMiles: number;
  totalDriveMin: number;
  totalServiceMin: number;
  returnMiles: number;
  returnDriveMin: number;
};

type PlanResponse = {
  date: string;
  mode: "reorder" | "rebalance";
  startHour: number;
  persisted: boolean;
  driveTimes?: "haversine" | "mapbox";
  assignments: PlanAssignment[];
  skipped: Array<{ id: string; number: string; title: string; reason: string }>;
  warnings: Array<{ technicianId: string; message: string }>;
  error?: string;
};

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function RoutePlanner({
  date,
  technicians,
}: {
  date: string;
  technicians: TechOption[];
}) {
  const router = useRouter();
  const gpsTechs = useMemo(
    () => technicians.filter((tech) => tech.homeLat != null && tech.homeLng != null),
    [technicians],
  );
  const [mode, setMode] = useState<"reorder" | "rebalance">("reorder");
  const [startHour, setStartHour] = useState(8);
  const [selected, setSelected] = useState<string[]>(() => gpsTechs.map((tech) => tech.id));
  const [loading, setLoading] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanResponse | null>(null);

  useEffect(() => {
    setPlan(null);
  }, [date]);

  function invalidate() {
    setPlan(null);
  }

  async function run(persist: boolean) {
    if (selected.length === 0) {
      setError("Pick at least one technician with home GPS.");
      return;
    }
    setLoading(persist ? "apply" : "preview");
    setError("");
    const response = await fetch("/api/routes/optimize", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        technicianIds: selected,
        mode,
        startHour,
        persist,
      }),
    });
    const data = (await response.json()) as PlanResponse;
    setLoading(null);
    if (!response.ok) {
      setError(data.error ?? "Could not optimize routes.");
      return;
    }
    setPlan(data);
    if (persist) router.refresh();
  }

  function toggleTech(id: string) {
    invalidate();
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  const stopCount = plan?.assignments.reduce((sum, item) => sum + item.stops.length, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-panel p-4 md:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setPlan(null);
                router.push(`/routes?date=${event.target.value}`);
              }}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            First roll-out
            <select
              value={startHour}
              onChange={(event) => {
                invalidate();
                setStartHour(Number(event.target.value));
              }}
              className={inputClass}
            >
              {Array.from({ length: 8 }, (_, index) => index + 5).map((hour) => (
                <option key={hour} value={hour}>
                  {format(new Date(2026, 0, 1, hour), "h:mm a")}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm">Mode</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <ModeButton
                active={mode === "reorder"}
                title="Keep techs"
                detail="Fix driving order only"
                onClick={() => {
                  invalidate();
                  setMode("reorder");
                }}
              />
              <ModeButton
                active={mode === "rebalance"}
                title="Rebalance"
                detail="Move stops between techs"
                onClick={() => {
                  invalidate();
                  setMode("rebalance");
                }}
              />
            </div>
          </fieldset>
        </div>

        <p className="mt-4 text-sm font-medium">Technicians</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {technicians.map((tech) => {
            const hasGps = tech.homeLat != null && tech.homeLng != null;
            return (
              <label
                key={tech.id}
                className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm ${
                  hasGps ? "border-line bg-white" : "border-dashed border-line bg-background text-stone-500"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={!hasGps}
                  checked={hasGps && selected.includes(tech.id)}
                  onChange={() => toggleTech(tech.id)}
                />
                <span>
                  {tech.firstName} {tech.lastName}
                  {hasGps ? "" : " · no home GPS"}
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => run(false)}
            disabled={loading !== null}
            className="min-h-11 flex-1 rounded-lg border border-ink px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {loading === "preview" ? "Previewing…" : "Preview"}
          </button>
          <button
            type="button"
            onClick={() => run(true)}
            disabled={loading !== null || !plan}
            className="min-h-11 flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading === "apply" ? "Saving…" : "Apply to schedule"}
          </button>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Preview does not move the board. Apply writes stop order, drive times, and visit start times.
        </p>
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      </div>

      {plan ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">
              {plan.persisted ? "Applied" : "Preview"} · {stopCount} stop{stopCount === 1 ? "" : "s"}
            </h2>
            <p className="text-sm text-stone-500">
              {plan.mode === "reorder" ? "Kept assignments" : "Rebalanced"} · start{" "}
              {format(new Date(2026, 0, 1, plan.startHour), "h:mm a")}
              {plan.driveTimes === "mapbox" ? " · road times" : " · straight-line miles"}
            </p>
          </div>
          {plan.warnings.map((warning) => (
            <p key={warning.technicianId} className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {warning.message}
            </p>
          ))}
          {plan.skipped.length > 0 ? (
            <div className="rounded-xl border border-line bg-background px-3 py-2 text-sm">
              <p className="font-medium">Left out of the plan</p>
              <ul className="mt-1 space-y-1 text-stone-600">
                {plan.skipped.map((job) => (
                  <li key={job.id}>
                    <Link href={`/jobs/${job.id}`} className="text-orange">
                      {job.number}
                    </Link>{" "}
                    {job.title} ·{" "}
                    {job.reason === "missing_coordinates"
                      ? "could not geocode this address"
                      : "tech has no home GPS"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {plan.assignments.map((assignment) => (
              <article key={assignment.technicianId} className="rounded-2xl border border-line bg-panel p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {assignment.technician.firstName} {assignment.technician.lastName}
                    </h3>
                    {assignment.stops.length > 0 ? (
                      <NavigateLink
                        className="mt-2"
                        label="Navigate this route"
                        stops={assignment.stops.map((stop) => ({
                          address: stop.address,
                          lat: stop.lat,
                          lng: stop.lng,
                        }))}
                      />
                    ) : null}
                  </div>
                  <p className="text-right text-xs text-stone-500">
                    {assignment.totalMiles} mi · {assignment.totalDriveMin} min drive
                    <br />
                    +{assignment.returnMiles} mi back to shop
                  </p>
                </div>
                {assignment.stops.length === 0 ? (
                  <p className="text-sm text-stone-500">No stops after this plan.</p>
                ) : (
                  <ol className="space-y-2">
                    {assignment.stops.map((stop) => (
                      <li key={stop.id} className="rounded-xl bg-background px-3 py-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="font-display text-lg leading-none text-orange">{stop.sequence}</span>
                          <div className="min-w-0 flex-1">
                            <Link href={`/jobs/${stop.jobId}`} className="font-medium">
                              {stop.title}
                            </Link>
                            <p className="text-xs text-stone-500">
                              {stop.number}
                              {stop.clientName ? ` · ${stop.clientName}` : ""}
                            </p>
                            {stop.address ? <p className="text-xs text-stone-600">{stop.address}</p> : null}
                            <p className="text-xs text-stone-500">
                              {stop.sequence === 1 ? "From home" : `Drive ${stop.driveMinFromPrev} min`} ·{" "}
                              {stop.milesFromPrev} mi · ETA {format(new Date(stop.eta), "h:mm a")} ·{" "}
                              {stop.durationMin} min on site
                            </p>
                            <NavigateLink
                              className="mt-2"
                              destination={{ address: stop.address, lat: stop.lat, lng: stop.lng }}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModeButton({
  active,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-left ${
        active ? "border-orange bg-orange/10" : "border-line bg-white"
      }`}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-stone-500">{detail}</p>
    </button>
  );
}
