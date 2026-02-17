import { db } from "@/lib/db";

export const metadata = { title: "Sync Runs" };

export const dynamic = "force-dynamic";

export default async function SyncRunsPage() {
  const runs = await db.syncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
    include: {
      syncRecords: {
        where: { action: "FAILED" },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          registrationId: true,
          errorMessage: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold md:text-2xl">Sync Runs</h1>
      <p className="text-sm text-muted-foreground">History of HubSpot synchronization batches.</p>

      {runs.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          No sync runs yet. Trigger a run from Registrations.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Triggered By</th>
                <th className="px-4 py-3 font-medium">Totals</th>
                <th className="px-4 py-3 font-medium">Recent Errors</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {run.startedAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded border px-2 py-1 text-xs font-medium">
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{run.triggeredBy ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {run.totalRecords} total · {run.syncedRecords} synced · {run.failedRecords} failed ·{" "}
                    {run.skippedRecords} skipped
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {run.syncRecords.length === 0 ? (
                      "—"
                    ) : (
                      <ul className="space-y-1">
                        {run.syncRecords.map((record) => (
                          <li key={record.id}>
                            {record.registrationId}: {record.errorMessage ?? "Unknown error"}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
