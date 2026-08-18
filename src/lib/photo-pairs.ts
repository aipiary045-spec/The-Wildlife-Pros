export type PhotoLike = {
  id: string;
  kind: string;
  url: string;
  caption: string | null;
  entryPoint: { label: string } | null;
};

export type PhotoPair = {
  key: string;
  label: string;
  before: PhotoLike | null;
  after: PhotoLike | null;
};

export function groupPhotoPairs(photos: PhotoLike[]): { pairs: PhotoPair[]; other: PhotoLike[] } {
  const buckets = new Map<string, { label: string; before: PhotoLike | null; after: PhotoLike | null }>();
  const other: PhotoLike[] = [];

  for (const photo of photos) {
    if (photo.kind === "BEFORE" || photo.kind === "AFTER") {
      const key = photo.entryPoint?.label ?? photo.caption?.trim() ?? "general";
      const bucket = buckets.get(key) ?? {
        label: photo.entryPoint?.label ?? photo.caption?.trim() ?? "General",
        before: null,
        after: null,
      };
      if (photo.kind === "BEFORE" && !bucket.before) bucket.before = photo;
      else if (photo.kind === "AFTER" && !bucket.after) bucket.after = photo;
      else other.push(photo);
      buckets.set(key, bucket);
    } else {
      other.push(photo);
    }
  }

  const pairs = [...buckets.entries()].map(([key, bucket]) => ({
    key,
    label: bucket.label,
    before: bucket.before,
    after: bucket.after,
  }));

  return { pairs, other };
}
