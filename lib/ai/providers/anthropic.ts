import Anthropic from "@anthropic-ai/sdk";
import type { AiAdapter, ChatAdapter } from "@/lib/ai/types";

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey });
}

function extractText(blocks: Anthropic.ContentBlock[]): string {
  return blocks
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

const MAX_TOKENS = 8192;

export const callAnthropic: AiAdapter = async (prompt, model) => {
  const message = await getClient().messages.create({
    model,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });
  return extractText(message.content);
};

export const chatAnthropic: ChatAdapter = async (system, messages, model) => {
  const message = await getClient().messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system,
    messages,
  });
  return extractText(message.content);
};
