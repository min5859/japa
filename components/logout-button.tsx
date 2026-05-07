"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleLogout}
      disabled={pending}
      title="로그아웃"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">로그아웃</span>
    </Button>
  );
}
