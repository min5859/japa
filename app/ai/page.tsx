"use client";

import { useState, useTransition } from "react";
import { Bot, AlertCircle, TrendingUp, ShieldAlert, Lightbulb, FileText, RefreshCw } from "lucide-react";
import { runAiAnalysis } from "@/app/actions/ai";
import type { AiAnalysisResult } from "@/lib/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  { key: "risks", label: "리스크 및 주의사항", icon: AlertCircle, color: "text-red-400" }
];

export default function AiPage() {
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    setError(null);
    startTransition(async () => {
      try {
        const data = await runAiAnalysis();
        setResult(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Bot className="h-5 w-5 text-primary" />
            AI 재무 분석
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gemini AI가 현재 포트폴리오를 분석하고 맞춤형 조언을 제공합니다.
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isPending} size="sm">
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          {isPending ? "분석 중..." : result ? "재분석" : "분석 시작"}
        </Button>
      </div>

      {error && (
        <Card className="border-red-500/50">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {!result && !isPending && !error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
            <Bot className="h-12 w-12 text-muted-foreground/30" />
            <div>
              <p className="font-medium">AI 분석을 시작하세요</p>
              <p className="mt-1 text-sm text-muted-foreground">
                포트폴리오·세금 데이터를 바탕으로 Gemini가 종합 분석을 제공합니다.
              </p>
            </div>
            <Button onClick={handleAnalyze}>분석 시작</Button>
          </CardContent>
        </Card>
      )}

      {isPending && (
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

      {result && !isPending && (
        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map(({ key, label, icon: Icon, color }) => {
            const text = result[key];
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
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {result && (
        <p className="text-xs text-muted-foreground">
          * AI 분석은 참고용이며 실제 투자·세금 결정에 앞서 전문가 상담을 권장합니다.
        </p>
      )}
    </div>
  );
}
