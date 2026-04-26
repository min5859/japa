import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Landmark, Layers3 } from "lucide-react";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Personal Asset Dashboard",
  description: "Single-user asset dashboard for manual portfolio tracking."
};

const navigation = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/holdings", label: "Holdings", icon: Layers3 }
];

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <div className="dashboard-backdrop min-h-screen">
          <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6">
            <header className="mb-8 flex flex-col gap-5 rounded-[2rem] border bg-card/80 p-5 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Owner-only manual asset control
                </p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                  Personal Asset Dashboard
                </h1>
              </div>
              <nav className="flex flex-wrap gap-2">
                {navigation.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border bg-background/70 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                      )}
                      href={item.href}
                      key={item.href}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
