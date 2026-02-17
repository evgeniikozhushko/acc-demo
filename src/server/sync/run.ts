import "server-only";

import { db } from "@/lib/db";
import type { SyncAction, SyncRunStatus, SyncStatus, ValidationStatus } from "@/lib/types";
import { getRegistrationsForDashboard } from "@/server/registrations/query";
import { upsertHubSpotContactByEmail } from "@/server/hubspot/upsert";

type SyncSummary = {
  syncRunId: string;
  status: SyncRunStatus;
  totalRecords: number;
  syncedRecords: number;
  failedRecords: number;
  skippedRecords: number;
};

const ELIGIBLE_STATUSES = new Set<ValidationStatus>(["VALID", "WARNING"]);

type SyncCounters = Pick<
  SyncSummary,
  "totalRecords" | "syncedRecords" | "failedRecords" | "skippedRecords"
>;

export async function runRegistrationSync(triggeredBy = "Manual"): Promise<SyncSummary> {
  const rows = await getRegistrationsForDashboard();

  const syncRun = await db.syncRun.create({
    data: {
      status: "RUNNING",
      triggeredBy,
      totalRecords: rows.length,
    },
  });

  const counters: SyncCounters = {
    totalRecords: rows.length,
    syncedRecords: 0,
    failedRecords: 0,
    skippedRecords: 0,
  };

  let finalStatus: SyncRunStatus = "COMPLETED";

  for (const row of rows) {
    const started = Date.now();

    if (!ELIGIBLE_STATUSES.has(row.validationStatus)) {
      counters.skippedRecords += 1;
      await db.registration.update({
        where: { id: row.id },
        data: { syncStatus: "SKIPPED" satisfies SyncStatus },
      });
      await db.syncRecord.create({
        data: {
          syncRunId: syncRun.id,
          registrationId: row.id,
          action: "SKIPPED" satisfies SyncAction,
          errorMessage: `Skipped due to validation status: ${row.validationStatus}`,
          durationMs: Date.now() - started,
        },
      });
      continue;
    }

    if (!row.email) {
      counters.skippedRecords += 1;
      await db.registration.update({
        where: { id: row.id },
        data: { syncStatus: "SKIPPED" satisfies SyncStatus },
      });
      await db.syncRecord.create({
        data: {
          syncRunId: syncRun.id,
          registrationId: row.id,
          action: "SKIPPED" satisfies SyncAction,
          errorMessage: "Skipped because email is missing.",
          durationMs: Date.now() - started,
        },
      });
      continue;
    }

    try {
      const upsert = await upsertHubSpotContactByEmail(row.email, row.hubspotPayload);
      const action: SyncAction = row.hubspotId ? "UPDATED" : "CREATED";

      counters.syncedRecords += 1;

      await db.registration.update({
        where: { id: row.id },
        data: {
          syncStatus: "SYNCED" satisfies SyncStatus,
          hubspotId: upsert.hubspotId ?? row.hubspotId,
        },
      });

      await db.syncRecord.create({
        data: {
          syncRunId: syncRun.id,
          registrationId: row.id,
          action,
          hubspotId: upsert.hubspotId ?? row.hubspotId,
          durationMs: Date.now() - started,
        },
      });
    } catch (error) {
      counters.failedRecords += 1;
      finalStatus = "FAILED";
      const message = error instanceof Error ? error.message : "Unknown sync error";

      await db.registration.update({
        where: { id: row.id },
        data: { syncStatus: "FAILED" satisfies SyncStatus },
      });

      await db.syncRecord.create({
        data: {
          syncRunId: syncRun.id,
          registrationId: row.id,
          action: "FAILED" satisfies SyncAction,
          errorMessage: message,
          durationMs: Date.now() - started,
        },
      });
    }
  }

  const completed = await db.syncRun.update({
    where: { id: syncRun.id },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      syncedRecords: counters.syncedRecords,
      failedRecords: counters.failedRecords,
      skippedRecords: counters.skippedRecords,
    },
  });

  return {
    syncRunId: completed.id,
    status: completed.status as SyncRunStatus,
    totalRecords: completed.totalRecords,
    syncedRecords: completed.syncedRecords,
    failedRecords: completed.failedRecords,
    skippedRecords: completed.skippedRecords,
  };
}
