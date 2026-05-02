import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Personal Asset Dashboard",
  description: "Single-user asset dashboard for manual portfolio tracking."
};

export const dynamic = "force-dynamic";

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
          {isAuthPage ? children : <AppShell>{children}</AppShell>}
        </div>
      </body>
    </html>
  );
}
