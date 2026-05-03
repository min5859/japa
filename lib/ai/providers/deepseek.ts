import OpenAI from "openai";
import type { AiAdapter } from "@/lib/ai/types";

// DeepSeek은 OpenAI 호환 API (baseURL만 다름) — openai SDK 재사용.
export const callDeepSeek: AiAdapter = async (prompt, model) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });
  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
};
