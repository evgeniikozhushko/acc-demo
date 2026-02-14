// src/app/dashboard/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    template: "%s | ACC Demo Dashboard",
    default: "ACC Demo Dashboard",
  },
  robots: { index: false, follow: false },
};

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/registrations", label: "Registrations" },
  { href: "/dashboard/sync-runs", label: "Sync Runs" },
  { href: "/dashboard/mappings", label: "Mappings" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="rounded-lg border bg-card p-3">
            <div className="px-2 py-2 text-sm font-semibold">ACC Demo</div>
            <nav className="mt-2 space-y-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
