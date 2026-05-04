import OpenAI from "openai";
import type { AiAdapter, ChatAdapter } from "@/lib/ai/types";

// DeepSeek은 OpenAI 호환 API (baseURL만 다름) — openai SDK 재사용.
function getClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");
  return new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
}

export const callDeepSeek: AiAdapter = async (prompt, model) => {
  const completion = await getClient().chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
};

export const chatDeepSeek: ChatAdapter = async (system, messages, model) => {
  const completion = await getClient().chat.completions.create({
    model,
    messages: [{ role: "system", content: system }, ...messages],
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
};
