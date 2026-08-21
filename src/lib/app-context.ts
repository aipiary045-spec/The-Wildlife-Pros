import { getSession } from "@/lib/auth";
import { getViewMode, isFieldView, navRole, type ViewMode } from "@/lib/view-mode";

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
