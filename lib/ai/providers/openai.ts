import OpenAI from "openai";
import type { AiAdapter } from "@/lib/ai/types";

export const callOpenAi: AiAdapter = async (prompt, model) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
};
