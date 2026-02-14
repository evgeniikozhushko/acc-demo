/**
 * ACC Demo seed — realistic, intentionally messy data
 *
 * Demonstrates the problem this app solves:
 * - 3 source systems with inconsistent field formats
 * - Section name variants (Calgary vs YYC Section vs YYC)
 * - Phone number format chaos
 * - Missing required fields (waiver, emergency contact)
 * - Same person registered in multiple systems (duplicate email)
 * - One membership with an empty membershipType (invalid)
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import type {
  CourseRegistrationPayload,
  HutBookingPayload,
  MembershipPayload,
  SourceType,
} from "../src/lib/types";

const db = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Raw source data — as if pulled from Hapily, Mews, and a manual CSV
// ─────────────────────────────────────────────────────────────────────────────

const courseRegistrations: Array<{
  externalId: string;
  sourceRef: string;
  payload: CourseRegistrationPayload;
}> = [
  {
    externalId: "HAP-2026-001",
    sourceRef: "GMC-2026 / A",
    payload: {
      firstName: "Sarah",
      lastName: "Okonkwo",
      email: "sarah.okonkwo@email.com",
      phone: "403-555-0101",
      membershipNumber: "ACC-88421",
      membershipType: "Full",
      section: "Calgary", // ← inconsistent vs "YYC Section" below
      courseCode: "GMC-2026",
      courseName: "General Mountaineering Camp 2026",
      startDate: "2026-07-12",
      waiverSigned: true,
      emergencyContact: "James Okonkwo: 403-555-0102",
      postalCode: "T2P 1G5",
    },
  },
  {
    externalId: "HAP-2026-002",
    sourceRef: "GMC-2026 / B",
    payload: {
      firstName: "Marcus",
      lastName: "Tran",
      email: "mtran@outlook.com",
      phone: "+14035550203", // ← different phone format
      membershipNumber: "ACC-77312",
      membershipType: "Associate",
      section: "YYC Section", // ← "YYC Section" vs "Calgary" above
      courseCode: "GMC-2026",
      courseName: "General Mountaineering Camp 2026",
      startDate: "2026-07-12",
      waiverSigned: true,
      emergencyContact: "Linh Tran: 403-555-0204",
      postalCode: "T2R 0B9",
    },
  },
  {
    externalId: "HAP-2026-003",
    sourceRef: "SKI-W26 / A",
    payload: {
      firstName: "Priya",
      lastName: "Sharma",
      email: "priya.sharma@gmail.com",
      phone: "6049870044", // ← no dashes, no country code
      membershipType: "Youth",
      section: "Vancouver",
      courseCode: "SKI-W26",
      courseName: "Ski Mountaineering Week 2026",
      startDate: "2026-03-01",
      waiverSigned: false, // ← BLOCKED — waiver missing
      postalCode: "V6B 1A1",
      // emergencyContact intentionally missing ← WARNING
    },
  },
  {
    externalId: "HAP-2026-004",
    sourceRef: "GMC-2026 / C",
    payload: {
      firstName: "Daniel",
      lastName: "Leblanc",
      email: "daniel.leblanc@icloud.com",
      phone: "(780) 555-0312", // ← yet another format
      membershipNumber: "ACC-91033",
      membershipType: "Full",
      section: "Edmonton",
      courseCode: "GMC-2026",
      courseName: "General Mountaineering Camp 2026",
      startDate: "2026-07-12",
      waiverSigned: true,
      emergencyContact: "Claire Leblanc: 780-555-0313",
      postalCode: "T5J 0N3",
    },
  },
  {
    externalId: "HAP-2026-005",
    sourceRef: "ICE-F26 / A",
    payload: {
      firstName: "Amara",
      lastName: "Diallo",
      email: "amara.diallo@email.com", // ← same email as membership below (cross-system duplicate)
      phone: "250-555-0177",
      membershipType: "Full",
      section: "Whistler",
      courseCode: "ICE-F26",
      courseName: "Intro to Ice Climbing 2026",
      startDate: "2026-11-07",
      waiverSigned: true,
      emergencyContact: "Fatou Diallo: 250-555-0178",
      postalCode: "V8E 0A1",
    },
  },
  {
    externalId: "HAP-2026-006",
    sourceRef: "GMC-2026 / D",
    payload: {
      firstName: "Tyler",
      lastName: "Wong",
      email: "tyler.wong@shaw.ca",
      // phone intentionally missing
      membershipNumber: "ACC-44821",
      membershipType: "Associate",
      section: "YYC", // ← "YYC" vs "YYC Section" vs "Calgary" — 3 variants now
      courseCode: "GMC-2026",
      courseName: "General Mountaineering Camp 2026",
      startDate: "2026-07-12",
      waiverSigned: true,
      emergencyContact: "Betty Wong: 403-555-0888",
      postalCode: "T3A 1Z2",
    },
  },
  {
    externalId: "HAP-2026-007",
    sourceRef: "ALP-S26 / A",
    payload: {
      firstName: "Kenji",
      lastName: "Nakamura",
      email: "kenji.nakamura@gmail.com",
      phone: "6045550092",
      membershipType: "Student",
      section: "Vancouver Island",
      courseCode: "ALP-S26",
      courseName: "Alpine Skills Course 2026",
      startDate: "2026-06-20",
      waiverSigned: false, // ← BLOCKED — waiver missing
      emergencyContact: "Hana Nakamura: 604-555-0093",
      postalCode: "V8W 1A1",
    },
  },
];

const hutBookings: Array<{
  externalId: string;
  sourceRef: string;
  payload: HutBookingPayload;
}> = [
  {
    externalId: "MEWS-2026-101",
    sourceRef: "STAN-20260814",
    payload: {
      firstName: "Rachel",
      lastName: "Fortin",
      email: "rachel.fortin@hotmail.com",
      phone: "4035550421",
      hutName: "Stanley Mitchell Hut",
      checkIn: "2026-08-14",
      checkOut: "2026-08-17",
      partySize: 4,
      membershipNumber: "ACC-55920",
      waiverSigned: true,
      specialRequests: "Vegetarian meals preferred",
    },
  },
  {
    externalId: "MEWS-2026-102",
    sourceRef: "ABBOT-20260901",
    payload: {
      firstName: "Omar",
      lastName: "Al-Rashid",
      email: "omar.alrashid@gmail.com",
      phone: "403-555-0507",
      hutName: "Abbot Pass Refuge Cabin",
      checkIn: "2026-09-01",
      checkOut: "2026-09-03",
      partySize: 2,
      waiverSigned: true,
      // no membershipNumber — non-member booking
    },
  },
  {
    externalId: "MEWS-2026-103",
    sourceRef: "LIZRD-20260715",
    payload: {
      firstName: "Amara", // ← same person as course HAP-2026-005 (cross-system duplicate)
      lastName: "Diallo",
      email: "amara.diallo@email.com", // ← DUPLICATE email
      phone: "250-555-0177",
      hutName: "Lizard Head Hut",
      checkIn: "2026-07-15",
      checkOut: "2026-07-18",
      partySize: 3,
      membershipNumber: "ACC-66104",
      waiverSigned: true,
    },
  },
  {
    externalId: "MEWS-2026-104",
    sourceRef: "ELBOW-20260820",
    payload: {
      firstName: "Ingrid",
      lastName: "Bergstrom",
      email: "ingrid.bergstrom@shaw.ca",
      phone: "+1 403 555 0654", // ← spaces in phone number
      hutName: "Elbow Lake Shelter",
      checkIn: "2026-08-20",
      checkOut: "2026-08-22",
      partySize: 6,
      membershipNumber: "ACC-29871",
      waiverSigned: false, // ← BLOCKED — waiver missing
      specialRequests: "Arriving late afternoon",
    },
  },
  {
    externalId: "MEWS-2026-105",
    sourceRef: "STAN-20260710",
    payload: {
      firstName: "Luca",
      lastName: "Moretti",
      email: "luca.moretti@gmail.com",
      phone: "7785550831",
      hutName: "Stanley Mitchell Hut",
      checkIn: "2026-07-10",
      checkOut: "2026-07-14",
      partySize: 2,
      membershipNumber: "ACC-38817",
      waiverSigned: true,
    },
  },
];

const memberships: Array<{
  externalId: string;
  sourceRef: string;
  payload: MembershipPayload;
}> = [
  {
    externalId: "SEC-2026-201",
    sourceRef: "MBR-YYC-0041",
    payload: {
      firstName: "Christine",
      lastName: "Beausoleil",
      email: "c.beausoleil@telus.net",
      phone: "403-555-0711",
      membershipType: "Full",
      section: "Calgary Section", // ← "Calgary Section" vs "Calgary" vs "YYC" — more variants
      renewalDate: "2027-01-15",
      postalCode: "T2S 2Y4",
      emergencyContact: "Pierre Beausoleil: 403-555-0712",
      waiverSigned: true,
      prmType: "None",
    },
  },
  {
    externalId: "SEC-2026-202",
    sourceRef: "MBR-VAN-0019",
    payload: {
      firstName: "James",
      lastName: "Hartley",
      email: "james.hartley@gmail.com",
      phone: "6045550192",
      membershipType: "Family",
      section: "Vancouver",
      renewalDate: "2026-12-31",
      postalCode: "V5K 1B3",
      emergencyContact: "Nadia Hartley: 604-555-0193",
      waiverSigned: true,
      prmType: "None",
    },
  },
  {
    externalId: "SEC-2026-203",
    sourceRef: "MBR-EDM-0088",
    payload: {
      firstName: "Fatima",
      lastName: "Hussain",
      email: "fatima.hussain@ualberta.ca",
      phone: "7805550344",
      membershipType: "", // ← intentionally empty — BLOCKED (invalid)
      section: "Edmonton",
      postalCode: "T6G 2R3",
      // emergencyContact missing ← WARNING
      waiverSigned: true,
      prmType: "Mobility",
    },
  },
  {
    externalId: "SEC-2026-204",
    sourceRef: "MBR-WHI-0007",
    payload: {
      firstName: "Nathan",
      lastName: "Gervais",
      email: "ngervais@outlook.com",
      phone: "604 555 0466", // ← spaces
      membershipType: "Associate",
      section: "Whistler",
      renewalDate: "2027-03-01",
      postalCode: "V0N 1B1",
      emergencyContact: "Sophie Gervais: 604-555-0467",
      waiverSigned: true,
      prmType: "None",
    },
  },
  {
    externalId: "SEC-2026-205",
    sourceRef: "MBR-YYC-0042",
    payload: {
      firstName: "Amara", // ← same person again — third system
      lastName: "Diallo",
      email: "amara.diallo@email.com", // ← DUPLICATE (appears in HAP-2026-005 + MEWS-2026-103)
      phone: "250-555-0177",
      membershipType: "Full",
      section: "Whistler",
      renewalDate: "2027-01-01",
      postalCode: "V8E 0A1",
      emergencyContact: "Fatou Diallo: 250-555-0178",
      waiverSigned: true,
      prmType: "None",
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default field mappings — one per source field → HubSpot property
// ─────────────────────────────────────────────────────────────────────────────

const defaultMappings = [
  // COURSE → CONTACT
  { sourceType: "COURSE", sourceField: "firstName", hubspotObject: "CONTACT", hubspotProperty: "firstname" },
  { sourceType: "COURSE", sourceField: "lastName", hubspotObject: "CONTACT", hubspotProperty: "lastname" },
  { sourceType: "COURSE", sourceField: "email", hubspotObject: "CONTACT", hubspotProperty: "email" },
  { sourceType: "COURSE", sourceField: "phone", hubspotObject: "CONTACT", hubspotProperty: "phone", transformFn: "normalizePhone" },
  { sourceType: "COURSE", sourceField: "membershipType", hubspotObject: "CONTACT", hubspotProperty: "acc_membership_type" },
  { sourceType: "COURSE", sourceField: "section", hubspotObject: "CONTACT", hubspotProperty: "acc_section", transformFn: "normalizeSection" },
  { sourceType: "COURSE", sourceField: "courseCode", hubspotObject: "CONTACT", hubspotProperty: "acc_last_course_code" },
  { sourceType: "COURSE", sourceField: "courseName", hubspotObject: "CONTACT", hubspotProperty: "acc_last_course_name" },
  { sourceType: "COURSE", sourceField: "waiverSigned", hubspotObject: "CONTACT", hubspotProperty: "acc_waiver_signed" },
  { sourceType: "COURSE", sourceField: "postalCode", hubspotObject: "CONTACT", hubspotProperty: "zip" },

  // HUT_BOOKING → CONTACT
  { sourceType: "HUT_BOOKING", sourceField: "firstName", hubspotObject: "CONTACT", hubspotProperty: "firstname" },
  { sourceType: "HUT_BOOKING", sourceField: "lastName", hubspotObject: "CONTACT", hubspotProperty: "lastname" },
  { sourceType: "HUT_BOOKING", sourceField: "email", hubspotObject: "CONTACT", hubspotProperty: "email" },
  { sourceType: "HUT_BOOKING", sourceField: "phone", hubspotObject: "CONTACT", hubspotProperty: "phone", transformFn: "normalizePhone" },
  { sourceType: "HUT_BOOKING", sourceField: "hutName", hubspotObject: "CONTACT", hubspotProperty: "acc_last_hut_booked" },
  { sourceType: "HUT_BOOKING", sourceField: "waiverSigned", hubspotObject: "CONTACT", hubspotProperty: "acc_waiver_signed" },

  // MEMBERSHIP → CONTACT
  { sourceType: "MEMBERSHIP", sourceField: "firstName", hubspotObject: "CONTACT", hubspotProperty: "firstname" },
  { sourceType: "MEMBERSHIP", sourceField: "lastName", hubspotObject: "CONTACT", hubspotProperty: "lastname" },
  { sourceType: "MEMBERSHIP", sourceField: "email", hubspotObject: "CONTACT", hubspotProperty: "email" },
  { sourceType: "MEMBERSHIP", sourceField: "phone", hubspotObject: "CONTACT", hubspotProperty: "phone", transformFn: "normalizePhone" },
  { sourceType: "MEMBERSHIP", sourceField: "membershipType", hubspotObject: "CONTACT", hubspotProperty: "acc_membership_type" },
  { sourceType: "MEMBERSHIP", sourceField: "section", hubspotObject: "CONTACT", hubspotProperty: "acc_section", transformFn: "normalizeSection" },
  { sourceType: "MEMBERSHIP", sourceField: "renewalDate", hubspotObject: "CONTACT", hubspotProperty: "acc_membership_renewal_date" },
  { sourceType: "MEMBERSHIP", sourceField: "postalCode", hubspotObject: "CONTACT", hubspotProperty: "zip" },
  { sourceType: "MEMBERSHIP", sourceField: "waiverSigned", hubspotObject: "CONTACT", hubspotProperty: "acc_waiver_signed" },
  { sourceType: "MEMBERSHIP", sourceField: "prmType", hubspotObject: "CONTACT", hubspotProperty: "acc_prm_type" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding ACC Demo database...");

  // Clear existing data (order matters for foreign keys)
  await db.syncRecord.deleteMany();
  await db.syncRun.deleteMany();
  await db.registration.deleteMany();
  await db.fieldMapping.deleteMany();

  // ── Course registrations (Hapily source) ────────────────────────────────
  for (const r of courseRegistrations) {
    const sourceType: SourceType = "COURSE";
    await db.registration.create({
      data: {
        sourceType,
        externalId: r.externalId,
        sourceRef: r.sourceRef,
        email: r.payload.email,
        firstName: r.payload.firstName,
        lastName: r.payload.lastName,
        rawData: r.payload,
      },
    });
  }
  console.log(`  Created ${courseRegistrations.length} course registrations`);

  // ── Hut bookings (Mews source) ───────────────────────────────────────────
  for (const r of hutBookings) {
    const sourceType: SourceType = "HUT_BOOKING";
    await db.registration.create({
      data: {
        sourceType,
        externalId: r.externalId,
        sourceRef: r.sourceRef,
        email: r.payload.email,
        firstName: r.payload.firstName,
        lastName: r.payload.lastName,
        rawData: r.payload,
      },
    });
  }
  console.log(`  Created ${hutBookings.length} hut bookings`);

  // ── Memberships (Sections manual source) ────────────────────────────────
  for (const r of memberships) {
    const sourceType: SourceType = "MEMBERSHIP";
    await db.registration.create({
      data: {
        sourceType,
        externalId: r.externalId,
        sourceRef: r.sourceRef,
        email: r.payload.email,
        firstName: r.payload.firstName,
        lastName: r.payload.lastName,
        rawData: r.payload,
      },
    });
  }
  console.log(`  Created ${memberships.length} memberships`);

  // ── Field mappings ────────────────────────────────────────────────────────
  for (const m of defaultMappings) {
    await db.fieldMapping.create({ data: m });
  }
  console.log(`  Created ${defaultMappings.length} field mappings`);

  const total = courseRegistrations.length + hutBookings.length + memberships.length;
  console.log(`\nDone! ${total} registrations + ${defaultMappings.length} field mappings seeded.`);
  console.log("\nData story:");
  console.log("  - 2 records with waiverSigned: false → BLOCKED");
  console.log("  - 1 record with empty membershipType → BLOCKED");
  console.log("  - 2 records missing emergencyContact → WARNING");
  console.log("  - amara.diallo@email.com appears in 3 source systems → DUPLICATE");
  console.log("  - Section names: Calgary / YYC Section / YYC / Calgary Section (4 variants)");
  console.log("  - Phone formats: 5 different formats across records");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
