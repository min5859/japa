"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPortfolio } from "@/lib/data";
import { chat, type ChatMessage } from "@/lib/ai";
import { PROVIDERS, type AiProvider } from "@/lib/ai/types";
import { CHAT_SYSTEM_PROMPT, buildPortfolioContext } from "@/lib/ai/context";
import { calcDividendIncome, calcForeignGains, calcTaxAdvantaged } from "@/lib/tax";

const TITLE_MAX = 30;

function deriveTitle(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= TITLE_MAX) return trimmed;
  return trimmed.slice(0, TITLE_MAX) + "…";
}

async function buildSystemPrompt(): Promise<string> {
  const { accounts, summary } = await getPortfolio();
  const dividend = calcDividendIncome(accounts);
  const foreignGain = calcForeignGains(accounts);
  const taxAdvantaged = calcTaxAdvantaged(accounts);
  return CHAT_SYSTEM_PROMPT(
    buildPortfolioContext(accounts, summary, dividend, foreignGain, taxAdvantaged)
  );
}

export async function createThread(): Promise<string> {
  const t = await prisma.chatThread.create({ data: {} });
  revalidatePath("/chat");
  redirect(`/chat/${t.id}`);
}

export async function deleteThread(id: string): Promise<void> {
  await prisma.chatThread.delete({ where: { id } });
  revalidatePath("/chat");
  redirect("/chat");
}

export async function sendMessage(
  threadId: string,
  provider: AiProvider,
  userContent: string
): Promise<void> {
  const trimmed = userContent.trim();
  if (!trimmed) return;
  if (!PROVIDERS.includes(provider)) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!thread) throw new Error("Thread not found");

  const history: ChatMessage[] = thread.messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));
  history.push({ role: "user", content: trimmed });

  const systemPrompt = await buildSystemPrompt();
  const { reply, model } = await chat(provider, systemPrompt, history);

  await prisma.$transaction([
    prisma.chatMessage.create({
      data: { threadId, role: "user", content: trimmed },
    }),
    prisma.chatMessage.create({
      data: { threadId, role: "assistant", content: reply, provider, model },
    }),
    prisma.chatThread.update({
      where: { id: threadId },
      data: {
        updatedAt: new Date(),
        // 첫 user 메시지로 자동 title (이후엔 유지)
        title: thread.title ?? deriveTitle(trimmed),
      },
    }),
  ]);

  revalidatePath("/chat");
  revalidatePath(`/chat/${threadId}`);
}
