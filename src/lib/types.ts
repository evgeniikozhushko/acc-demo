// ─────────────────────────────────────────────────────────────────────────────
// Domain type aliases
// These mirror the string values stored in the DB (Prisma uses String for
// these fields). TypeScript enforces correctness at the app layer.
// ─────────────────────────────────────────────────────────────────────────────

export type SourceType = "COURSE" | "HUT_BOOKING" | "MEMBERSHIP";
export type ValidationStatus = "PENDING" | "VALID" | "WARNING" | "BLOCKED" | "DUPLICATE";

export type ValidationIssueSeverity = "error" | "warning" | "info";

export type ValidationIssue = {
  severity: ValidationIssueSeverity;
  code: string;
  message: string;
  field?: string;
};
export type SyncStatus = "PENDING" | "SYNCED" | "FAILED" | "SKIPPED";
export type SyncRunStatus = "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type SyncAction = "CREATED" | "UPDATED" | "SKIPPED" | "FAILED";
export type HubSpotObject = "CONTACT" | "DEAL" | "COMPANY";

/** @deprecated Use ValidationIssue instead */
export type ValidationError = {
  field: string;
  message: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// ACC raw registration payload types
// These are the shapes of rawData stored per source type.
// All fields are typed to match what the source systems actually send.
// ─────────────────────────────────────────────────────────────────────────────

export type CourseRegistrationPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  membershipNumber?: string;
  membershipType?: string; // "Full" | "Associate" | "Youth" | "Student" | ...
  section?: string; // "Calgary" | "YYC Section" | "Whistler" | "Vancouver" | ...
  courseCode: string; // e.g. "GMC-2026"
  courseName: string; // e.g. "General Mountaineering Camp"
  startDate: string; // ISO date string
  waiverSigned: boolean;
  emergencyContact?: string;
  postalCode?: string;
};

export type HutBookingPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  hutName: string; // e.g. "Stanley Mitchell Hut"
  checkIn: string; // ISO date string
  checkOut: string; // ISO date string
  partySize: number;
  membershipNumber?: string;
  waiverSigned: boolean;
  specialRequests?: string;
};

export type MembershipPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  membershipType: string; // "Full" | "Associate" | "Youth" | "Family" | ...
  section: string; // ACC section name
  renewalDate?: string; // ISO date string
  postalCode?: string;
  emergencyContact?: string;
  waiverSigned: boolean;
  prmType?: string; // "None" | "Mobility" | "Visual" | "Hearing" | ...
};

export type RawPayload =
  | CourseRegistrationPayload
  | HutBookingPayload
  | MembershipPayload;
