import "server-only";

import { hubspotFetch } from "./client";
import type { HubSpotContactProperties } from "@/server/registrations/hubspot-payload";

type HubSpotBatchUpsertInput = {
  idProperty: "email";
  id: string;
  properties: HubSpotContactProperties;
};

type HubSpotBatchUpsertResponse = {
  results?: Array<{
    id?: string;
  }>;
};

export async function upsertHubSpotContactByEmail(
  email: string,
  properties: HubSpotContactProperties
): Promise<{ hubspotId: string | null }> {
  const body = {
    inputs: [
      {
        idProperty: "email",
        id: email,
        properties,
      } satisfies HubSpotBatchUpsertInput,
    ],
  };

  const res = await hubspotFetch<HubSpotBatchUpsertResponse>(
    "/crm/v3/objects/contacts/batch/upsert",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );

  return {
    hubspotId: res.results?.[0]?.id ?? null,
  };
}
