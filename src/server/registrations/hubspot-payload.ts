import "server-only";

import type { CanonicalContact } from "./canonical";

// ─────────────────────────────────────────────────────────────────────────────
// HubSpot contact properties object
// Shaped for POST /crm/v3/objects/contacts/batch/upsert
// Only includes properties that have a value (no undefined/null entries sent).
// ─────────────────────────────────────────────────────────────────────────────

export type HubSpotContactProperties = Record<string, string | boolean | number>;

export function buildHubSpotContactPayload(
  canonical: CanonicalContact
): HubSpotContactProperties {
  const props: HubSpotContactProperties = {
    firstname: canonical.firstName,
    lastname: canonical.lastName,
    email: canonical.email,
    acc_waiver_signed: canonical.waiverSigned,
  };

  if (canonical.phone) props.phone = canonical.phone;
  if (canonical.membershipType) props.acc_membership_type = canonical.membershipType;
  if (canonical.section) props.acc_section = canonical.section;
  if (canonical.emergencyContact) props.acc_emergency_contact = canonical.emergencyContact;

  // Map source-specific extras where HubSpot properties are known
  const extras = canonical.extras;
  if (extras.courseCode) props.acc_last_course_code = extras.courseCode as string;
  if (extras.courseName) props.acc_last_course_name = extras.courseName as string;
  if (extras.hutName) props.acc_last_hut_booked = extras.hutName as string;
  if (extras.renewalDate) props.acc_membership_renewal_date = extras.renewalDate as string;
  if (extras.postalCode) props.zip = extras.postalCode as string;
  if (extras.prmType) props.acc_prm_type = extras.prmType as string;

  return props;
}
