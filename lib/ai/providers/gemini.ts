import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiAdapter, ChatAdapter } from "@/lib/ai/types";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenerativeAI(apiKey);
}

export const callGemini: AiAdapter = async (prompt, model) => {
  const m = getClient().getGenerativeModel({ model });
  const result = await m.generateContent(prompt);
  return result.response.text().trim();
};

export const chatGemini: ChatAdapter = async (system, messages, model) => {
  const m = getClient().getGenerativeModel({ model, systemInstruction: system });
  // Gemini는 user/model 역할 사용. 마지막 user 메시지를 sendMessage로 전달.
  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    throw new Error("chatGemini: last message must be from user");
  }
  const chat = m.startChat({ history });
  const result = await chat.sendMessage(last.content);
  return result.response.text().trim();
};
