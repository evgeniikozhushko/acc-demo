// src/app/dashboard/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Overview" };

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold md:text-2xl">Overview</h1>
      <Card>
        <CardHeader>
          <CardTitle>System status</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Health checks, recent sync runs, and registration pipeline snapshot will live here.
        </CardContent>
      </Card>
    </div>
  );
}
