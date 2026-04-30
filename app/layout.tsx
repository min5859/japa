import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { BarChart3, Bot, Landmark, Layers3, Receipt, TrendingUp } from "lucide-react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { RefreshPricesButton } from "@/components/refresh-prices-button";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = {
  title: "Personal Asset Dashboard",
  description: "Single-user asset dashboard for manual portfolio tracking."
};

export const dynamic = "force-dynamic";

const navigation = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/holdings", label: "Holdings", icon: Layers3 },
  { href: "/market", label: "Market", icon: TrendingUp },
  { href: "/tax", label: "세금", icon: Receipt },
  { href: "/ai", label: "AI 분석", icon: Bot }
];

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAuthPage = pathname.startsWith("/login");

  return (
    <html lang="ko">
      <body>
        <div className="dashboard-backdrop min-h-screen">
          {isAuthPage ? (
            children
          ) : (
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
                <div className="flex flex-wrap items-center gap-2">
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
                  <div className="ml-auto flex items-center gap-2">
                    <RefreshPricesButton />
                    <LogoutButton />
                  </div>
                </div>
              </header>
              <main className="flex-1">{children}</main>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
