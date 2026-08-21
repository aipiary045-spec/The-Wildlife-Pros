import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import {
  canSwitchViewMode,
  isFieldView,
  navRole,
  readViewMode,
  VIEW_MODE_COOKIE,
  type ViewMode,
} from "@/lib/view-mode";

async function getViewMode(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  if (!canSwitchViewMode(session.role)) return "office" as const;
  const jar = await cookies();
  return readViewMode(jar.get(VIEW_MODE_COOKIE)?.value);
}

export async function getAppContext() {
  const session = await getSession();
  if (!session) return null;
  const viewMode = await getViewMode(session);
  const fieldView = isFieldView(session.role, viewMode);
  return {
    session,
    viewMode,
    fieldView,
    navRole: navRole(session.role, viewMode),
  };
}

export type AppContext = {
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  viewMode: ViewMode;
  fieldView: boolean;
  navRole: string;
};
