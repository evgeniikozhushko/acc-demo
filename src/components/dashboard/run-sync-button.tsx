"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runRegistrationSyncAction } from "@/app/dashboard/registrations/actions";

export function RunSyncButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            const res = await runRegistrationSyncAction();
            toast.success(
              `Sync completed: ${res.syncedRecords} synced, ${res.failedRecords} failed, ${res.skippedRecords} skipped`
            );
            router.refresh();
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            toast.error(`Sync failed: ${message}`);
          }
        });
      }}
    >
      {isPending ? "Syncing..." : "Run HubSpot sync"}
    </Button>
  );
}
