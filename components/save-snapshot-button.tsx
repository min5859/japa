"use client";

import { useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveSnapshot } from "@/app/actions/snapshot";

export function SaveSnapshotButton() {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleClick() {
    startTransition(async () => {
      await saveSnapshot();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <Button size="sm" variant="ghost" onClick={handleClick} disabled={isPending} className="h-7 px-2 text-xs">
      <Camera className="h-3.5 w-3.5" />
      {isPending ? "저장 중..." : saved ? "저장됨 ✓" : "스냅샷"}
    </Button>
  );
}
