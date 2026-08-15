import { cn } from "@/lib/utils";
import type { ScheduleMode } from "./useScheduleBoard";

export function ScheduleModeToggle({
  mode,
  onChange,
}: {
  mode: ScheduleMode;
  onChange: (mode: ScheduleMode) => void;
}) {
  return (
    <div className="flex rounded-full border border-line bg-panel p-1">
      <button
        type="button"
        onClick={() => onChange("move")}
        className={cn(
          "flex-1 rounded-full px-4 py-2 text-sm font-semibold",
          mode === "move" ? "bg-ink text-white" : "text-stone-600",
        )}
      >
        Move
      </button>
      <button
        type="button"
        onClick={() => onChange("copy")}
        className={cn(
          "flex-1 rounded-full px-4 py-2 text-sm font-semibold",
          mode === "copy" ? "bg-orange text-white" : "text-stone-600",
        )}
      >
        Copy trip
      </button>
    </div>
  );
}
