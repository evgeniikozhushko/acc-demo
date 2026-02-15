import "server-only";

import type {
  CourseRegistrationPayload,
  HutBookingPayload,
  MembershipPayload,
  SourceType,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Canonical contact shape
// A normalized, source-agnostic view of a registration for display and mapping.
// ─────────────────────────────────────────────────────────────────────────────

export type CanonicalContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  membershipType: string | null;
  section: string | null;
  waiverSigned: boolean;
  emergencyContact: string | null;
  // source-specific extras preserved for display
  extras: Record<string, string | number | boolean | null>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Phone normalization
// Strips all non-digit characters then re-formats as +1XXXXXXXXXX if 10 digits.
// Leaves the value untouched if it's already an E.164-like string.
// ─────────────────────────────────────────────────────────────────────────────

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw.trim(); // return as-is if format is unexpected
}

// ─────────────────────────────────────────────────────────────────────────────
// Section normalization
// Collapses known variants to a canonical form.
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_ALIASES: Record<string, string> = {
  "yyc": "Calgary",
  "yyc section": "Calgary",
  "calgary section": "Calgary",
  "calgary": "Calgary",
  "van": "Vancouver",
  "van section": "Vancouver",
  "victoria": "Victoria",
  "edmonton": "Edmonton",
  "whistler": "Whistler",
  "vancouver island": "Vancouver Island",
};

export function normalizeSection(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return SECTION_ALIASES[raw.trim().toLowerCase()] ?? raw.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonicalization per source type
// ─────────────────────────────────────────────────────────────────────────────

function canonicalizeCourse(p: CourseRegistrationPayload): CanonicalContact {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    phone: normalizePhone(p.phone),
    membershipType: p.membershipType ?? null,
    section: normalizeSection(p.section),
    waiverSigned: p.waiverSigned,
    emergencyContact: p.emergencyContact ?? null,
    extras: {
      courseCode: p.courseCode,
      courseName: p.courseName,
      startDate: p.startDate,
      membershipNumber: p.membershipNumber ?? null,
      postalCode: p.postalCode ?? null,
    },
  };
}

function canonicalizeHutBooking(p: HutBookingPayload): CanonicalContact {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    phone: normalizePhone(p.phone),
    membershipType: null,
    section: null,
    waiverSigned: p.waiverSigned,
    emergencyContact: null,
    extras: {
      hutName: p.hutName,
      checkIn: p.checkIn,
      checkOut: p.checkOut,
      partySize: p.partySize,
      membershipNumber: p.membershipNumber ?? null,
      specialRequests: p.specialRequests ?? null,
    },
  };
}

function canonicalizeMembership(p: MembershipPayload): CanonicalContact {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    phone: normalizePhone(p.phone),
    membershipType: p.membershipType || null,
    section: normalizeSection(p.section),
    waiverSigned: p.waiverSigned,
    emergencyContact: p.emergencyContact ?? null,
    extras: {
      renewalDate: p.renewalDate ?? null,
      postalCode: p.postalCode ?? null,
      prmType: p.prmType ?? null,
    },
  };
}

export function canonicalize(
  sourceType: SourceType,
  rawData: unknown
): CanonicalContact {
  if (sourceType === "COURSE") return canonicalizeCourse(rawData as CourseRegistrationPayload);
  if (sourceType === "HUT_BOOKING") return canonicalizeHutBooking(rawData as HutBookingPayload);
  return canonicalizeMembership(rawData as MembershipPayload);
}
