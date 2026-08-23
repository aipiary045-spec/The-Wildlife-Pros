const STORAGE_KEY = "critterops-capture-defaults";

export type CaptureDefaults = {
  speciesId?: string;
  disposition?: string;
};

export function readCaptureDefaults(): CaptureDefaults {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CaptureDefaults;
    return {
      speciesId: typeof parsed.speciesId === "string" ? parsed.speciesId : undefined,
      disposition: typeof parsed.disposition === "string" ? parsed.disposition : undefined,
    };
  } catch {
    return {};
  }
}

export function writeCaptureDefaults(next: CaptureDefaults) {
  if (typeof window === "undefined") return;
  try {
    const current = readCaptureDefaults();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        speciesId: next.speciesId ?? current.speciesId,
        disposition: next.disposition ?? current.disposition,
      }),
    );
  } catch {
    // private mode / quota — ignore
  }
}
