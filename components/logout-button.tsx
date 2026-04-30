"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions/auth";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => startTransition(() => logout())}
      disabled={isPending}
      title="로그아웃"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">로그아웃</span>
    </Button>
  );
}
