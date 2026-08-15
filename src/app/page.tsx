import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homePath } from "@/lib/paths";

export default async function HomePage() {
  const session = await getSession();
  redirect(session ? homePath(session.role) : "/login");
}
