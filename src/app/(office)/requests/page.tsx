import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CallLogRedirect({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const params = await searchParams;
  const next = params.phone ? `/calls?phone=${encodeURIComponent(params.phone)}` : "/calls";
  redirect(next);
}
