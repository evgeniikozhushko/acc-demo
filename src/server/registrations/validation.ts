import "server-only";

import type {
  CourseRegistrationPayload,
  HutBookingPayload,
  MembershipPayload,
  SourceType,
  ValidationIssue,
  ValidationStatus,
} from "@/lib/types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCoursePayload(raw: unknown): raw is CourseRegistrationPayload {
  if (!isObject(raw)) return false;
  return (
    typeof raw.firstName === "string" &&
    typeof raw.lastName === "string" &&
    typeof raw.email === "string" &&
    typeof raw.courseCode === "string" &&
    typeof raw.courseName === "string" &&
    typeof raw.startDate === "string" &&
    typeof raw.waiverSigned === "boolean"
  );
}

function isHutBookingPayload(raw: unknown): raw is HutBookingPayload {
  if (!isObject(raw)) return false;
  return (
    typeof raw.firstName === "string" &&
    typeof raw.lastName === "string" &&
    typeof raw.email === "string" &&
    typeof raw.hutName === "string" &&
    typeof raw.checkIn === "string" &&
    typeof raw.checkOut === "string" &&
    typeof raw.partySize === "number" &&
    typeof raw.waiverSigned === "boolean"
  );
}

function isMembershipPayload(raw: unknown): raw is MembershipPayload {
  if (!isObject(raw)) return false;
  return (
    typeof raw.firstName === "string" &&
    typeof raw.lastName === "string" &&
    typeof raw.email === "string" &&
    typeof raw.membershipType === "string" &&
    typeof raw.section === "string" &&
    typeof raw.waiverSigned === "boolean"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-record validation
// Returns ordered issues; caller derives the final status.
// ─────────────────────────────────────────────────────────────────────────────

function validateCourse(payload: CourseRegistrationPayload): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!payload.waiverSigned) {
    issues.push({
      severity: "error",
      code: "WAIVER_MISSING",
      message: "Waiver has not been signed.",
      field: "waiverSigned",
    });
  }

  if (!payload.email || payload.email.trim() === "") {
    issues.push({
      severity: "error",
      code: "EMAIL_MISSING",
      message: "Email address is missing.",
      field: "email",
    });
  }

  if (!payload.emergencyContact || payload.emergencyContact.trim() === "") {
    issues.push({
      severity: "warning",
      code: "EMERGENCY_CONTACT_MISSING",
      message: "Emergency contact is not provided.",
      field: "emergencyContact",
    });
  }

  if (!payload.phone || payload.phone.trim() === "") {
    issues.push({
      severity: "warning",
      code: "PHONE_MISSING",
      message: "Phone number is not provided.",
      field: "phone",
    });
  }

  return issues;
}

function validateHutBooking(payload: HutBookingPayload): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!payload.waiverSigned) {
    issues.push({
      severity: "error",
      code: "WAIVER_MISSING",
      message: "Waiver has not been signed.",
      field: "waiverSigned",
    });
  }

  if (!payload.email || payload.email.trim() === "") {
    issues.push({
      severity: "error",
      code: "EMAIL_MISSING",
      message: "Email address is missing.",
      field: "email",
    });
  }

  if (!payload.phone || payload.phone.trim() === "") {
    issues.push({
      severity: "warning",
      code: "PHONE_MISSING",
      message: "Phone number is not provided.",
      field: "phone",
    });
  }

  return issues;
}

function validateMembership(payload: MembershipPayload): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!payload.membershipType || payload.membershipType.trim() === "") {
    issues.push({
      severity: "error",
      code: "MEMBERSHIP_TYPE_MISSING",
      message: "Membership type is empty or missing.",
      field: "membershipType",
    });
  }

  if (!payload.waiverSigned) {
    issues.push({
      severity: "error",
      code: "WAIVER_MISSING",
      message: "Waiver has not been signed.",
      field: "waiverSigned",
    });
  }

  if (!payload.email || payload.email.trim() === "") {
    issues.push({
      severity: "error",
      code: "EMAIL_MISSING",
      message: "Email address is missing.",
      field: "email",
    });
  }

  if (!payload.emergencyContact || payload.emergencyContact.trim() === "") {
    issues.push({
      severity: "warning",
      code: "EMERGENCY_CONTACT_MISSING",
      message: "Emergency contact is not provided.",
      field: "emergencyContact",
    });
  }

  if (!payload.phone || payload.phone.trim() === "") {
    issues.push({
      severity: "warning",
      code: "PHONE_MISSING",
      message: "Phone number is not provided.",
      field: "phone",
    });
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// Derive status from issues (pre-duplicate step)
// Precedence: BLOCKED > WARNING > VALID
// DUPLICATE is applied separately by the caller after duplicate detection.
// ─────────────────────────────────────────────────────────────────────────────

function deriveStatusFromIssues(issues: ValidationIssue[]): "VALID" | "WARNING" | "BLOCKED" {
  if (issues.some((i) => i.severity === "error")) return "BLOCKED";
  if (issues.some((i) => i.severity === "warning")) return "WARNING";
  return "VALID";
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export type RecordValidationResult = {
  issues: ValidationIssue[];
  status: "VALID" | "WARNING" | "BLOCKED";
};

export function validateRecord(
  sourceType: SourceType,
  rawData: unknown
): RecordValidationResult {
  let issues: ValidationIssue[];

  if (sourceType === "COURSE") {
    if (!isCoursePayload(rawData)) {
      return {
        status: "BLOCKED",
        issues: [
          {
            severity: "error",
            code: "RAW_DATA_INVALID",
            message: "Raw payload does not match expected COURSE shape.",
          },
        ],
      };
    }
    issues = validateCourse(rawData);
  } else if (sourceType === "HUT_BOOKING") {
    if (!isHutBookingPayload(rawData)) {
      return {
        status: "BLOCKED",
        issues: [
          {
            severity: "error",
            code: "RAW_DATA_INVALID",
            message: "Raw payload does not match expected HUT_BOOKING shape.",
          },
        ],
      };
    }
    issues = validateHutBooking(rawData);
  } else {
    if (!isMembershipPayload(rawData)) {
      return {
        status: "BLOCKED",
        issues: [
          {
            severity: "error",
            code: "RAW_DATA_INVALID",
            message: "Raw payload does not match expected MEMBERSHIP shape.",
          },
        ],
      };
    }
    issues = validateMembership(rawData);
  }

  return { issues, status: deriveStatusFromIssues(issues) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate detection
// Takes a list of { id, email } and returns a Set of IDs that are duplicates
// (i.e. share a normalised email with at least one other record in the set).
// ─────────────────────────────────────────────────────────────────────────────

export function findDuplicateIds(
  records: Array<{ id: string; email: string | null }>
): Set<string> {
  const emailToIds = new Map<string, string[]>();

  for (const r of records) {
    if (!r.email) continue;
    const normalized = r.email.trim().toLowerCase();
    const existing = emailToIds.get(normalized) ?? [];
    existing.push(r.id);
    emailToIds.set(normalized, existing);
  }

  const duplicateIds = new Set<string>();
  for (const ids of emailToIds.values()) {
    if (ids.length > 1) {
      ids.forEach((id) => duplicateIds.add(id));
    }
  }

  return duplicateIds;
}

// ─────────────────────────────────────────────────────────────────────────────
// Final status with DUPLICATE applied
// Precedence: BLOCKED > DUPLICATE > WARNING > VALID
// ─────────────────────────────────────────────────────────────────────────────

export function applyDuplicate(
  base: "VALID" | "WARNING" | "BLOCKED",
  isDuplicate: boolean
): ValidationStatus {
  if (base === "BLOCKED") return "BLOCKED";
  if (isDuplicate) return "DUPLICATE";
  return base;
}

export function buildDuplicateIssue(email: string | null): ValidationIssue {
  return {
    severity: "warning",
    code: "DUPLICATE_EMAIL",
    message: email
      ? `Duplicate email detected: ${email}.`
      : "Duplicate record detected by email.",
    field: "email",
  };
}
