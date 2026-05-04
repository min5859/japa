import OpenAI from "openai";
import type { AiAdapter, ChatAdapter } from "@/lib/ai/types";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
}

export const callOpenAi: AiAdapter = async (prompt, model) => {
  const completion = await getClient().chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
};

export const chatOpenAi: ChatAdapter = async (system, messages, model) => {
  const completion = await getClient().chat.completions.create({
    model,
    messages: [{ role: "system", content: system }, ...messages],
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
};
