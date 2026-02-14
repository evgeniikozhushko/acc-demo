// src/app/dashboard/settings/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HubSpotTestButton } from "@/components/dashboard/hubspot-test-button";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold md:text-2xl">Settings</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Test server-side connectivity to HubSpot using the private app token.
          </p>
          <HubSpotTestButton />
        </CardContent>
      </Card>
    </div>
  );
}
