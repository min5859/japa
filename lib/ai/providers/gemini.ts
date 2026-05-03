import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiAdapter } from "@/lib/ai/types";

export const callGemini: AiAdapter = async (prompt, model) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({ model });
  const result = await m.generateContent(prompt);
  return result.response.text().trim();
};
