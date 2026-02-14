import "server-only";
import { hubspotFetch } from "./client";

type HubSpotAccountInfo = {
  portalId: number;
  timeZone: string;
  currency: string;
  utcOffset: string;
};

export async function hubspotHealthCheck() {
  // Lightweight, read-only endpoint
  const info = await hubspotFetch<HubSpotAccountInfo>("/account-info/v3/details");

  return {
    ok: true as const,
    account: {
      portalId: info.portalId,
      timeZone: info.timeZone,
      currency: info.currency,
    },
    timestamp: new Date().toISOString(),
  };
}
