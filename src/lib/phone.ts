export function phoneDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

export function telHref(phone?: string | null) {
  const digits = phoneDigits(phone);
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length >= 7) return `tel:${digits}`;
  return null;
}

export function phonesMatch(left?: string | null, right?: string | null) {
  const a = phoneDigits(left);
  const b = phoneDigits(right);
  if (a.length < 7 || b.length < 7) return false;
  return a.slice(-10) === b.slice(-10);
}
