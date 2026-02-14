"use server";

import { hubspotHealthCheck } from "@/server/hubspot/health";

export async function testHubSpotHealthAction() {
  // You can extend this later with logging / DB writes
  return await hubspotHealthCheck();
}
