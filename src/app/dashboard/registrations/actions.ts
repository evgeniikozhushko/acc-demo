"use server";

import { getRegistrationsForDashboard } from "@/server/registrations/query";
import type { SourceType } from "@/lib/types";

export async function fetchRegistrationsAction(sourceType?: SourceType) {
  return getRegistrationsForDashboard(sourceType ? { sourceType } : undefined);
}
