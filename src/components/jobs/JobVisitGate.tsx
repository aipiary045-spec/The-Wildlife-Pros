"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { visitActionForStatus } from "@/lib/job-visit";

type JobVisitContextValue = {
  onSite: boolean;
  markOnSite: () => void;
  fieldWorkUnlocked: boolean;
  canCheckOut: boolean;
};

const JobVisitContext = createContext<JobVisitContextValue | null>(null);

export function JobVisitProvider({
  children,
  status,
  checkedIn,
}: {
  children: React.ReactNode;
  status: string;
  checkedIn: boolean;
}) {
  const action = visitActionForStatus(status);
  const serverOnSite = checkedIn || action === "check-out";
  const [onSite, setOnSite] = useState(serverOnSite);

  useEffect(() => {
    setOnSite(serverOnSite);
  }, [serverOnSite]);

  const alwaysShow = action === null;
  const fieldWorkUnlocked = alwaysShow || onSite;
  const canCheckOut = onSite && action === "check-out";

  return (
    <JobVisitContext.Provider
      value={{
        onSite,
        markOnSite: () => setOnSite(true),
        fieldWorkUnlocked,
        canCheckOut,
      }}
    >
      {children}
    </JobVisitContext.Provider>
  );
}

export function useJobVisit() {
  const context = useContext(JobVisitContext);
  if (!context) {
    throw new Error("useJobVisit must be used within JobVisitProvider");
  }
  return context;
}

export function useOptionalJobVisit() {
  return useContext(JobVisitContext);
}
