"use client";

import { createContext, useContext, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createThread, deleteThread } from "@/app/actions/chat";
import type { ChatThreadListItem } from "@/lib/data";
import type { AiProvider } from "@/lib/ai";

type ProviderOption = { value: AiProvider; label: string };

const ProvidersContext = createContext<ProviderOption[]>([]);
export const useAvailableProviders = () => useContext(ProvidersContext);

function formatTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ChatShell({
  threads,
  availableProviders,
  children,
}: {
  threads: ChatThreadListItem[];
  availableProviders: ProviderOption[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleNewThread = () => {
    startTransition(async () => {
      await createThread();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("이 채팅을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      await deleteThread(id);
    });
  };

  return (
    <ProvidersContext.Provider value={availableProviders}>
      <div className="flex h-[calc(100vh-9rem)] gap-4">
        {/* 스레드 목록 */}
        <aside className="flex w-64 shrink-0 flex-col border-r pr-3">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="flex flex-1 items-center gap-2 text-sm font-semibold">
              <MessageCircle className="h-4 w-4 text-primary" />
              채팅
            </h2>
            <Button onClick={handleNewThread} size="sm" disabled={isPending}>
              <Plus className="h-4 w-4" />
              새 채팅
            </Button>
          </div>
          <ul className="flex-1 space-y-1 overflow-auto">
            {threads.length === 0 && (
              <li className="px-2 py-4 text-center text-xs text-muted-foreground">
                아직 채팅이 없습니다
              </li>
            )}
            {threads.map((t) => {
              const isActive = pathname === `/chat/${t.id}`;
              return (
                <li
                  key={t.id}
                  className={`group flex items-center gap-1 rounded-md ${
                    isActive ? "bg-secondary" : "hover:bg-secondary/40"
                  }`}
                >
                  <Link
                    href={`/chat/${t.id}`}
                    className="flex-1 truncate px-2 py-2 text-sm"
                  >
                    <div className="truncate font-medium">{t.title ?? "(제목 없음)"}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatTime(t.updatedAt)} · {t._count.messages}개 메시지
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    disabled={isPending}
                    className="invisible mr-1 rounded p-1 text-muted-foreground hover:text-red-500 group-hover:visible"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* 본문 */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </ProvidersContext.Provider>
  );
}
