import { listChatThreads } from "@/lib/data";
import { getAvailableProviderList } from "@/app/actions/ai";
import { ChatShell } from "./chat-shell";

export const dynamic = "force-dynamic";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const [threads, availableProviders] = await Promise.all([
    listChatThreads(30),
    getAvailableProviderList(),
  ]);
  return (
    <ChatShell threads={threads} availableProviders={availableProviders}>
      {children}
    </ChatShell>
  );
}
