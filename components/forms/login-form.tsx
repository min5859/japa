"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(
          data.message ?? "이메일이 등록된 주소라면 매직 링크가 발송됐습니다."
        );
      } else {
        setMessage("이메일 형식이 올바르지 않습니다.");
      }
    } catch {
      setMessage("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoFocus
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending || !email} className="w-full">
        {pending ? "발송 중..." : "매직 링크 보내기"}
      </Button>
      {message && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-md bg-muted/60 p-3 text-sm text-foreground/80"
        >
          {message}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        매직 링크가 메일로 발송됩니다. 메일이 안 보이면 스팸함을 확인하세요.
      </p>
    </form>
  );
}
