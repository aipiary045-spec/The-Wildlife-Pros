import { DISPOSITION_LABEL } from "@/lib/constants";
import { CHECKOUT_WORK, type CheckoutInput } from "@/lib/job-visit";

export function buildVisitSummarySms(input: {
  clientFirstName: string;
  techName?: string;
  jobTitle: string;
  companyName?: string;
  checkout: CheckoutInput;
  portalUrl?: string;
}) {
  const who = input.companyName?.trim() || "The Wildlife Pros";
  const tech = input.techName ? `${input.techName} from ${who}` : who;
  const lines: string[] = [
    `Hi ${input.clientFirstName},`,
    "",
    `${tech} finished today's visit for ${input.jobTitle}.`,
    "",
  ];

  const bullets: string[] = [];
  for (const id of input.checkout.workDone) {
    const label = CHECKOUT_WORK.find((item) => item.id === id)?.label;
    if (label) bullets.push(label);
  }
  for (const capture of input.checkout.captures ?? []) {
    const species = capture.speciesName?.trim() || "animal";
    const disposition =
      DISPOSITION_LABEL[capture.disposition]?.toLowerCase() ?? capture.disposition.toLowerCase().replace(/_/g, " ");
    const qty = capture.quantity > 1 ? `${capture.quantity}× ` : "";
    bullets.push(`${qty}${species} ${disposition}`);
  }
  if (input.checkout.trapPlaced) {
    const where = input.checkout.trapNote?.trim();
    bullets.push(where ? `Trap on site — ${where}` : "Trap placed on site");
  }
  if (input.checkout.exclusion) {
    const ex = input.checkout.exclusion;
    const bit = [ex.material, ex.entryLabel].filter(Boolean).join(" · ");
    bullets.push(bit ? `Exclusion work — ${bit}` : "Exclusion / sealing work");
  }
  if (input.checkout.notes?.trim()) {
    bullets.push(input.checkout.notes.trim());
  }

  if (bullets.length) {
    lines.push(...bullets.map((item) => `• ${item}`));
    lines.push("");
  }

  if (input.checkout.outcome === "follow_up" && input.checkout.followUp) {
    const days = input.checkout.followUp.returnInDays;
    const when =
      days === 1 ? "about tomorrow" : days <= 7 ? `in about ${days} days` : `in about ${days} days`;
    lines.push(`We'll schedule the next visit ${when}.`);
  } else {
    lines.push("Today's visit is complete. Call or text if anything comes up.");
  }

  if (input.portalUrl) {
    lines.push("", `Your account: ${input.portalUrl}`);
  } else {
    lines.push("", "Questions? Reply to this number.");
  }

  return lines.join("\n").trim();
}
