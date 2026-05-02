"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuoteSearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <form action="/quote" method="GET" className="flex gap-2">
      <Input
        name="symbol"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="티커 또는 6자리 코드 (예: AAPL, 005930)"
        className="flex-1"
        autoFocus
      />
      <Button type="submit">
        <Search className="h-4 w-4" />
        조회
      </Button>
    </form>
  );
}
