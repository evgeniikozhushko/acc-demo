"use server";

import { revalidatePath } from "next/cache";
import { getRegistrationsForDashboard } from "@/server/registrations/query";
import type { SourceType } from "@/lib/types";
import { runRegistrationSync } from "@/server/sync/run";

export async function fetchRegistrationsAction(sourceType?: SourceType) {
  return getRegistrationsForDashboard(sourceType ? { sourceType } : undefined);
}

export async function runRegistrationSyncAction() {
  const result = await runRegistrationSync("Manual dashboard run");
  revalidatePath("/dashboard/registrations");
  revalidatePath("/dashboard/sync-runs");
  return result;
}
