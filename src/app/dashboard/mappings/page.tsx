// src/app/dashboard/mappings/page.tsx
export const metadata = { title: "Mappings" };

export default function MappingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold md:text-2xl">Mappings</h1>
      <p className="text-sm text-muted-foreground">
        Field mappings and transformation rules between ACC source systems and HubSpot will be managed here.
      </p>
    </div>
  );
}
