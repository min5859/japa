"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Landmark,
  Layers3,
  Menu,
  Receipt,
  TrendingUp,
  X,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RefreshPricesButton } from "@/components/refresh-prices-button";
import { LogoutButton } from "@/components/logout-button";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/holdings", label: "Holdings", icon: Layers3 },
  { href: "/market", label: "Market", icon: TrendingUp },
  { href: "/tax", label: "세금", icon: Receipt },
  { href: "/ai", label: "AI 분석", icon: Bot }
];

function isItemActive(itemHref: string, pathname: string) {
  if (itemHref === "/") return pathname === "/";
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <div className="px-3 pb-6">
      <p className="text-xs font-medium text-muted-foreground">
        Owner-only manual asset control
      </p>
      <h1 className="mt-1 text-lg font-semibold tracking-tight">
        Personal Asset Dashboard
      </h1>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r bg-card/60 px-3 py-5 backdrop-blur md:flex">
        <SidebarBrand />
        <NavLinks pathname={pathname} />
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="사이드바 닫기"
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card px-3 py-5 shadow-xl md:hidden">
            <div className="mb-4 flex items-center justify-between px-3">
              <span className="text-sm font-semibold tracking-tight">메뉴</span>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-8">
          <button
            type="button"
            aria-label="메뉴 열기"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="md:hidden">
            <p className="text-sm font-semibold tracking-tight">JAPA</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <RefreshPricesButton />
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
