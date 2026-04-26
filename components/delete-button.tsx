"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "default" | "sm" | "lg";

export function DeleteButton({
  action,
  message,
  children,
  variant = "destructive",
  size = "sm",
  className
}: {
  action: () => Promise<void>;
  message: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  return (
    <form action={action}>
      <Button
        type="submit"
        size={size}
        variant={variant}
        className={className}
        onClick={(e) => {
          if (!confirm(message)) {
            e.preventDefault();
          }
        }}
      >
        {children}
      </Button>
    </form>
  );
}
