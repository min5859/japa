// AI provider 추상화 — 멀티 LLM 지원의 단일 진실 원천.
// 새 provider 추가 시: 1) PROVIDERS에 추가 2) lib/ai/providers/<name>.ts 작성 3) lib/ai/index.ts dispatch 추가

export const PROVIDERS = ["gemini", "openai", "anthropic", "deepseek"] as const;
export type AiProvider = (typeof PROVIDERS)[number];

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  deepseek: "DeepSeek",
};

// 환경변수에 키가 있어야 활성. server-side에서만 호출.
export const PROVIDER_ENV_KEYS: Record<AiProvider, string> = {
  gemini: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

export const PROVIDER_DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: "gemini-3-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-6",
  deepseek: "deepseek-chat",
};

// 환경변수로 provider별 모델 override
export const PROVIDER_MODEL_ENV_KEYS: Record<AiProvider, string> = {
  gemini: "GEMINI_MODEL",
  openai: "OPENAI_MODEL",
  anthropic: "ANTHROPIC_MODEL",
  deepseek: "DEEPSEEK_MODEL",
};

export type AiAnalysisResult = {
  summary: string;
  allocations: string;
  taxAdvice: string;
  recommendations: string;
  risks: string;
};

export const EMPTY_ANALYSIS: AiAnalysisResult = {
  summary: "",
  allocations: "",
  taxAdvice: "",
  recommendations: "",
  risks: "",
};

// 각 provider 어댑터가 구현하는 단일 메서드.
export type AiAdapter = (prompt: string, model: string) => Promise<string>;

// 채팅 메시지 형식 (provider-agnostic). assistant/user만 허용 (system은 별도 인자).
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatAdapter = (
  systemPrompt: string,
  messages: ChatMessage[],
  model: string
) => Promise<string>;
