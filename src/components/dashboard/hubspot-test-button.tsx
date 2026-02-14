"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { testHubSpotHealthAction } from "@/app/dashboard/settings/actions";

export function HubSpotTestButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            const res = await testHubSpotHealthAction();
            toast.success(
              `Connected to HubSpot (portalId: ${res.account.portalId})`
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            toast.error(`HubSpot connection failed: ${message}`);
          }
        });
      }}
    >
      {isPending ? "Testing..." : "Test HubSpot connection"}
    </Button>
  );
}
