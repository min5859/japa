import { notFound } from "next/navigation";
import { getChatThread } from "@/lib/data";
import { ChatThreadClient } from "./chat-thread-client";

export default async function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await getChatThread(id);
  if (!thread) notFound();

  return (
    <ChatThreadClient
      threadId={thread.id}
      title={thread.title}
      initialMessages={thread.messages.map((m) => ({
        id: m.id,
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
        provider: m.provider,
        model: m.model,
        createdAt: m.createdAt,
      }))}
    />
  );
}
