import { Suspense } from "react";
import { getRegistrationsForDashboard } from "@/server/registrations/query";
import { RegistrationsTable } from "@/components/dashboard/registrations-table";
import { RunSyncButton } from "@/components/dashboard/run-sync-button";

export const metadata = { title: "Registrations" };

// Force dynamic rendering so validation + DB writes happen on every request
export const dynamic = "force-dynamic";

async function RegistrationsContent() {
  let rows;
  try {
    rows = await getRegistrationsForDashboard();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        <p className="font-medium">Could not load registrations.</p>
        <p className="mt-1 text-muted-foreground">{message}</p>
        <p className="mt-2 text-muted-foreground text-xs">
          Make sure DATABASE_URL is set and the database is reachable.
        </p>
      </div>
    );
  }

  return <RegistrationsTable rows={rows} />;
}

export default function RegistrationsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">Registrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Incoming records from Hapily (courses), Mews (hut bookings), and Sections (memberships).
          Validation runs on load and is persisted to the database.
        </p>
        <div className="mt-4">
          <RunSyncButton />
        </div>
      </div>

      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">Loading registrations…</div>
        }
      >
        <RegistrationsContent />
      </Suspense>
    </div>
  );
}
