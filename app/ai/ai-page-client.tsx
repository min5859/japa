"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Bot,
  FileText,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { deleteAnalysis, runAiAnalysis } from "@/app/actions/ai";
import type { AiAnalysisResult, AiProvider } from "@/lib/ai";
import type { AiAnalysisListItem } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const SECTIONS: {
  key: keyof AiAnalysisResult;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { key: "summary", label: "포트폴리오 총평", icon: FileText, color: "text-primary" },
  { key: "allocations", label: "자산 배분 분석", icon: TrendingUp, color: "text-blue-400" },
  { key: "taxAdvice", label: "세금 최적화 조언", icon: ShieldAlert, color: "text-orange-400" },
  { key: "recommendations", label: "투자 개선 제안", icon: Lightbulb, color: "text-yellow-400" },
  { key: "risks", label: "리스크 및 주의사항", icon: AlertCircle, color: "text-red-400" },
];

export function AiPageClient({
  availableProviders,
  initialAnalyses,
}: {
  availableProviders: { value: AiProvider; label: string }[];
  initialAnalyses: AiAnalysisListItem[];
}) {
  const [analyses, setAnalyses] = useState<AiAnalysisListItem[]>(initialAnalyses);
  const [selectedId, setSelectedId] = useState<string | null>(initialAnalyses[0]?.id ?? null);
  const [provider, setProvider] = useState<AiProvider>(
    availableProviders[0]?.value ?? ("gemini" as AiProvider)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = useMemo(
    () => analyses.find((a) => a.id === selectedId) ?? null,
    [analyses, selectedId]
  );

  function handleAnalyze() {
    setError(null);
    startTransition(async () => {
      try {
        const created = await runAiAnalysis(provider);
        setAnalyses((prev) => [created, ...prev]);
        setSelectedId(created.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("이 분석을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      try {
        await deleteAnalysis(id);
        setAnalyses((prev) => {
          const next = prev.filter((a) => a.id !== id);
          if (selectedId === id) setSelectedId(next[0]?.id ?? null);
          return next;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.");
      }
    });
  }

  const noProvider = availableProviders.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Bot className="h-5 w-5 text-primary" />
            AI 재무 분석
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            여러 LLM이 현재 포트폴리오를 분석하고 맞춤형 조언을 제공합니다. 결과는 DB에 저장됩니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiProvider)}
            disabled={noProvider || isPending}
            className="w-auto"
          >
            {availableProviders.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
            {noProvider && <option value="">사용 가능한 키 없음</option>}
          </Select>
          <Button onClick={handleAnalyze} disabled={isPending || noProvider} size="sm">
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "분석 중..." : "분석 시작"}
          </Button>
        </div>
      </div>

      {noProvider && (
        <Card className="border-yellow-500/50">
          <CardContent className="py-4 text-sm text-yellow-600">
            <p className="font-medium">사용 가능한 LLM API 키가 없습니다.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              .env에 다음 중 하나 이상을 설정하세요: GEMINI_API_KEY, OPENAI_API_KEY,
              ANTHROPIC_API_KEY
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-500/50">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {!selected && !isPending && !error && !noProvider && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
            <Bot className="h-12 w-12 text-muted-foreground/30" />
            <div>
              <p className="font-medium">아직 분석 기록이 없습니다</p>
              <p className="mt-1 text-sm text-muted-foreground">
                상단의 "분석 시작" 버튼을 눌러 첫 분석을 만들어 보세요.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isPending && !selected && (
        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <Card key={s.key} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-32 rounded bg-secondary" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-3 w-full rounded bg-secondary" />
                <div className="h-3 w-4/5 rounded bg-secondary" />
                <div className="h-3 w-3/5 rounded bg-secondary" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDateTime(selected.createdAt)}</span>
            <span>·</span>
            <span>{selected.provider} / {selected.model}</span>
            {selected.netWorthAtTime != null && (
              <>
                <span>·</span>
                <span>당시 순자산 {formatCurrency(selected.netWorthAtTime)}</span>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {SECTIONS.map(({ key, label, icon: Icon, color }) => {
              const text = selected[key];
              if (!text) return null;
              return (
                <Card key={key} className={key === "summary" ? "sm:col-span-2" : ""}>
                  <CardHeader className="pb-3">
                    <CardTitle className={`flex items-center gap-2 text-sm font-semibold ${color}`}>
                      <Icon className="h-4 w-4" />
                      {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                      {text}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            * AI 분석은 참고용이며 실제 투자·세금 결정에 앞서 전문가 상담을 권장합니다.
          </p>
        </>
      )}

      {analyses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">이전 분석</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {analyses.map((a) => (
                <li
                  key={a.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${
                    a.id === selectedId ? "bg-secondary/50" : "hover:bg-secondary/30"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className="flex-1 text-left"
                  >
                    <div className="font-medium">{formatDateTime(a.createdAt)}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.provider} / {a.model}
                      {a.netWorthAtTime != null && (
                        <> · 순자산 {formatCurrency(a.netWorthAtTime)}</>
                      )}
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(a.id)}
                    disabled={isPending}
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
