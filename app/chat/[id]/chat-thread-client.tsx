"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, User, Bot, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { sendMessage } from "@/app/actions/chat";
import type { AiProvider } from "@/lib/ai";
import { useAvailableProviders } from "../chat-shell";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider: string | null;
  model: string | null;
  createdAt: Date;
};

function formatTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ChatThreadClient({
  threadId,
  title,
  initialMessages,
}: {
  threadId: string;
  title: string | null;
  initialMessages: Message[];
}) {
  const availableProviders = useAvailableProviders();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<AiProvider>(
    availableProviders[0]?.value ?? ("gemini" as AiProvider)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 메시지 추가될 때 자동 스크롤
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, isPending]);

  // initialMessages가 server revalidate로 갱신되면 동기화
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const noProvider = availableProviders.length === 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isPending || noProvider) return;
    setError(null);

    // 사용자 메시지 즉시 표시 (optimistic)
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: "user",
        content: trimmed,
        provider: null,
        model: null,
        createdAt: new Date(),
      },
    ]);
    setInput("");

    startTransition(async () => {
      try {
        await sendMessage(threadId, provider, trimmed);
        // server revalidate가 initialMessages 갱신 → useEffect로 동기화
      } catch (e) {
        setError(e instanceof Error ? e.message : "메시지 전송 실패");
        // 실패 시 optimistic 메시지 롤백
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="mb-3 flex items-center gap-2 border-b pb-2">
        <h2 className="flex-1 truncate text-sm font-semibold">
          {title ?? "(제목 없음)"}
        </h2>
        <Select
          value={provider}
          onChange={(e) => setProvider(e.target.value as AiProvider)}
          disabled={noProvider || isPending}
          className="w-auto text-xs"
        >
          {availableProviders.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
          {noProvider && <option value="">키 없음</option>}
        </Select>
      </div>

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-auto pr-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Bot className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm">
              궁금한 점을 입력하세요. 사용자의 포트폴리오·세금 데이터를 근거로 답변합니다.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const isUser = m.role === "user";
          const Icon = isUser ? User : Bot;
          return (
            <div key={m.id} className="flex gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isUser ? "bg-secondary" : "bg-primary/10"
                }`}
              >
                <Icon className={`h-4 w-4 ${isUser ? "" : "text-primary"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{isUser ? "나" : "AI"}</span>
                  {m.provider && <span>· {m.provider}/{m.model}</span>}
                  <span>· {formatTime(m.createdAt)}</span>
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}
        {isPending && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 animate-pulse text-primary" />
            </div>
            <div className="text-sm text-muted-foreground">생각 중...</div>
          </div>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-500">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* 입력 폼 */}
      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2 border-t pt-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            noProvider
              ? "사용 가능한 LLM API 키가 없습니다 (.env에 설정 필요)"
              : "질문을 입력하세요. (Shift+Enter로 줄바꿈)"
          }
          disabled={noProvider || isPending}
          rows={2}
          className="flex-1 resize-none"
        />
        <Button type="submit" disabled={!input.trim() || isPending || noProvider} size="sm">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
