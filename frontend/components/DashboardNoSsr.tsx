"use client";

import dynamic from "next/dynamic";

const DashboardClient = dynamic(() => import("@/components/DashboardClient"), {
  ssr: false,
  loading: () => <main className="dashboard-shell"><div className="notice">Loading dashboard...</div></main>
});

export function DashboardNoSsr() {
  return <DashboardClient />;
}
