import "server-only";

const HUBSPOT_BASE_URL = "https://api.hubapi.com";

export function getHubSpotToken(): string {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) throw new Error("Missing HUBSPOT_PRIVATE_APP_TOKEN");
  return token;
}

export async function hubspotFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = getHubSpotToken();

  const res = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    // Don't accidentally cache auth health checks
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HubSpot API error ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}
