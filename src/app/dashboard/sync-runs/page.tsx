// src/app/dashboard/sync-runs/page.tsx
export const metadata = { title: "Sync Runs" };

export default function SyncRunsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold md:text-2xl">Sync Runs</h1>
      <p className="text-sm text-muted-foreground">
        History of HubSpot synchronization runs, retry controls, and error logs will live here.
      </p>
    </div>
  );
}
