import "server-only";

import { db } from "@/lib/db";
import type { SourceType, ValidationStatus, ValidationIssue } from "@/lib/types";
import {
  validateRecord,
  findDuplicateIds,
  applyDuplicate,
  buildDuplicateIssue,
} from "./validation";
import { canonicalize, type CanonicalContact } from "./canonical";
import { buildHubSpotContactPayload, type HubSpotContactProperties } from "./hubspot-payload";

// ─────────────────────────────────────────────────────────────────────────────
// View model returned to the dashboard
// ─────────────────────────────────────────────────────────────────────────────

export type RegistrationRow = {
  id: string;
  sourceType: SourceType;
  externalId: string;
  sourceRef: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  validationStatus: ValidationStatus;
  validationIssues: ValidationIssue[];
  syncStatus: string;
  hubspotId: string | null;
  updatedAt: Date;
  // panels for the preview drawer
  rawData: unknown;
  canonical: CanonicalContact;
  hubspotPayload: HubSpotContactProperties;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main query
// 1. Loads all registrations (optionally filtered by sourceType)
// 2. Detects duplicates across the full dataset (all sources, pre-filter)
// 3. Validates each record
// 4. Persists changes to validationStatus + validationErrors for changed rows
// 5. Returns the filtered view model
// ─────────────────────────────────────────────────────────────────────────────

export async function getRegistrationsForDashboard(opts?: {
  sourceType?: SourceType;
}): Promise<RegistrationRow[]> {
  // Load all records — needed for cross-source duplicate detection
  const all = await db.registration.findMany({
    orderBy: { updatedAt: "desc" },
  });

  // Build duplicate index across all records
  const duplicateIds = findDuplicateIds(
    all.map((r) => ({ id: r.id, email: r.email }))
  );

  // Validate and persist changes
  const updates: Array<{
    id: string;
    validationStatus: string;
    validationErrors: ValidationIssue[];
  }> = [];
  const computedById = new Map<
    string,
    { validationStatus: ValidationStatus; validationIssues: ValidationIssue[] }
  >();

  for (const r of all) {
    const { issues, status: baseStatus } = validateRecord(
      r.sourceType as SourceType,
      r.rawData
    );
    const isDuplicate = duplicateIds.has(r.id);
    const finalStatus = applyDuplicate(baseStatus, isDuplicate);
    const computedIssues = isDuplicate
      ? [...issues, buildDuplicateIssue(r.email)]
      : issues;
    computedById.set(r.id, {
      validationStatus: finalStatus,
      validationIssues: computedIssues,
    });

    const currentStoredStatus = r.validationStatus as ValidationStatus;
    const currentStoredIssuesJson = JSON.stringify(r.validationErrors ?? []);
    const computedIssuesJson = JSON.stringify(computedIssues);

    if (
      currentStoredStatus !== finalStatus ||
      currentStoredIssuesJson !== computedIssuesJson
    ) {
      updates.push({
        id: r.id,
        validationStatus: finalStatus,
        validationErrors: computedIssues,
      });
    }
  }

  // Batch persist changed rows
  if (updates.length > 0) {
    await Promise.all(
      updates.map((u) =>
        db.registration.update({
          where: { id: u.id },
          data: {
            validationStatus: u.validationStatus,
            validationErrors: u.validationErrors,
          },
        })
      )
    );
  }

  // Build the view model, applying filter if requested
  const filtered = opts?.sourceType
    ? all.filter((r) => r.sourceType === opts.sourceType)
    : all;

  return filtered.map((r) => {
    const computed = computedById.get(r.id);
    const validationStatus = computed?.validationStatus ?? "PENDING";
    const validationIssues = computed?.validationIssues ?? [];
    const canonical = canonicalize(r.sourceType as SourceType, r.rawData);
    const hubspotPayload = buildHubSpotContactPayload(canonical);

    return {
      id: r.id,
      sourceType: r.sourceType as SourceType,
      externalId: r.externalId,
      sourceRef: r.sourceRef,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      validationStatus,
      validationIssues,
      syncStatus: r.syncStatus,
      hubspotId: r.hubspotId,
      updatedAt: r.updatedAt,
      rawData: r.rawData,
      canonical,
      hubspotPayload,
    };
  });
}
