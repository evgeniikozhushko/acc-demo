"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { SourceType, ValidationStatus, ValidationIssue } from "@/lib/types";
import type { CanonicalContact } from "@/server/registrations/canonical";
import type { HubSpotContactProperties } from "@/server/registrations/hubspot-payload";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RegistrationRowData = {
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
  rawData: unknown;
  canonical: CanonicalContact;
  hubspotPayload: HubSpotContactProperties;
};

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ValidationStatus,
  { label: string; className: string }
> = {
  VALID: {
    label: "Valid",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  WARNING: {
    label: "Warning",
    className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  },
  BLOCKED: {
    label: "Blocked",
    className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  },
  DUPLICATE: {
    label: "Duplicate",
    className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  },
  PENDING: {
    label: "Pending",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

function StatusBadge({ status }: { status: ValidationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Source label
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<SourceType, string> = {
  COURSE: "Course",
  HUT_BOOKING: "Hut Booking",
  MEMBERSHIP: "Membership",
};

// ─────────────────────────────────────────────────────────────────────────────
// JSON panel helper
// ─────────────────────────────────────────────────────────────────────────────

function JsonPanel({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <pre className="overflow-auto rounded-md border bg-muted px-3 py-2 text-xs leading-relaxed">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Issues list
// ─────────────────────────────────────────────────────────────────────────────

function IssuesList({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Validation Issues
      </p>
      <ul className="space-y-1">
        {issues.map((issue, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span
              className={
                issue.severity === "error"
                  ? "text-red-600 font-medium"
                  : "text-amber-600 font-medium"
              }
            >
              {issue.severity === "error" ? "Error" : "Warning"}
            </span>
            <span className="text-muted-foreground">
              {issue.field && <span className="font-mono">{issue.field}: </span>}
              {issue.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview sheet
// ─────────────────────────────────────────────────────────────────────────────

function PreviewSheet({
  row,
  open,
  onClose,
}: {
  row: RegistrationRowData | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!row) return null;

  const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ") || "—";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>{fullName}</SheetTitle>
          <SheetDescription>
            {SOURCE_LABELS[row.sourceType]} · {row.externalId}
            {row.sourceRef ? ` · ${row.sourceRef}` : ""}
          </SheetDescription>
          <div className="pt-1">
            <StatusBadge status={row.validationStatus} />
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-6">
          <IssuesList issues={row.validationIssues} />
          <JsonPanel label="Raw Payload" value={row.rawData} />
          <JsonPanel label="Canonical" value={row.canonical} />
          <JsonPanel label="HubSpot Payload" value={row.hubspotPayload} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Source filter tabs
// ─────────────────────────────────────────────────────────────────────────────

type FilterValue = "ALL" | SourceType;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "COURSE", label: "Courses" },
  { value: "HUT_BOOKING", label: "Hut Bookings" },
  { value: "MEMBERSHIP", label: "Memberships" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function RegistrationsTable({ rows }: { rows: RegistrationRowData[] }) {
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [selectedRow, setSelectedRow] = useState<RegistrationRowData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const displayed =
    filter === "ALL" ? rows : rows.filter((r) => r.sourceType === filter);

  function openPreview(row: RegistrationRowData) {
    setSelectedRow(row);
    setSheetOpen(true);
  }

  // Summary counts
  const counts = {
    total: rows.length,
    valid: rows.filter((r) => r.validationStatus === "VALID").length,
    warning: rows.filter((r) => r.validationStatus === "WARNING").length,
    blocked: rows.filter((r) => r.validationStatus === "BLOCKED").length,
    duplicate: rows.filter((r) => r.validationStatus === "DUPLICATE").length,
  };

  return (
    <>
      {/* Summary strip */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="text-muted-foreground">{counts.total} total</span>
        {counts.valid > 0 && (
          <span className="text-emerald-700">{counts.valid} valid</span>
        )}
        {counts.warning > 0 && (
          <span className="text-amber-700">{counts.warning} warning</span>
        )}
        {counts.blocked > 0 && (
          <span className="text-red-700">{counts.blocked} blocked</span>
        )}
        {counts.duplicate > 0 && (
          <span className="text-blue-700">{counts.duplicate} duplicate</span>
        )}
      </div>

      {/* Source filter */}
      <div className="flex gap-1 flex-wrap">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Ref</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No registrations found.
                </TableCell>
              </TableRow>
            ) : (
              displayed.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {[row.firstName, row.lastName].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {SOURCE_LABELS[row.sourceType]}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {row.sourceRef ?? row.externalId}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.validationStatus} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openPreview(row)}
                    >
                      Preview
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PreviewSheet
        row={selectedRow}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
