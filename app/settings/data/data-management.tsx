"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Download, AlertTriangle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  resetAccountData,
  importAccountData,
  type DataActionState
} from "@/app/actions/data";

const EXPORTS: { type: string; label: string }[] = [
  { type: "accounts", label: "계좌 (accounts)" },
  { type: "groups", label: "그룹 (groups)" },
  { type: "holdings", label: "보유 (holdings)" },
  { type: "transactions", label: "거래 (transactions)" },
  { type: "dividends", label: "배당 (dividends)" }
];

const INITIAL: DataActionState = { error: null, message: null };

export function DataManagement() {
  const [resetState, resetAction] = useActionState(resetAccountData, INITIAL);
  const [importState, importAction] = useActionState(importAccountData, INITIAL);
  const [resetPending, startResetTransition] = useTransition();
  const [importPending, startImportTransition] = useTransition();
  const [confirm, setConfirm] = useState("");
  const importFormRef = useRef<HTMLFormElement>(null);

  function onResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirm !== "RESET") return;
    if (!window.confirm("계좌·그룹·보유·거래·배당 데이터를 모두 삭제합니다. 계속하시겠습니까?")) {
      return;
    }
    const fd = new FormData(e.currentTarget);
    startResetTransition(() => resetAction(fd));
    setConfirm("");
  }

  function onImportSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startImportTransition(() => importAction(fd));
  }

  return (
    <div className="space-y-6">
      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" /> 1. CSV 내보내기
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            5개 CSV 를 모두 다운로드한 뒤 안전한 위치에 보관하세요. 동일 CSV 를 그대로 import 하면
            ID·외래키·날짜가 보존되어 원상태로 복원됩니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {EXPORTS.map(({ type, label }) => (
              <a
                key={type}
                href={`/api/export/${type}`}
                download
                className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <Download className="h-4 w-4" />
                {label}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reset */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> 2. 계좌 데이터 초기화
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">되돌릴 수 없는 작업입니다.</p>
            <p className="mt-1 text-xs">
              Account / AccountGroup / Holding / Transaction / Dividend 5개 테이블의 모든 행을
              삭제합니다. 시장 시세 캐시·AI 분석·채팅·스냅샷은 유지됩니다. 반드시 위 CSV 다운로드를
              먼저 수행하세요.
            </p>
          </div>

          {resetState.error && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {resetState.error}
            </div>
          )}
          {resetState.message && (
            <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              {resetState.message}
            </div>
          )}

          <form onSubmit={onResetSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="confirm">
                확인을 위해 <code className="rounded bg-muted px-1.5 py-0.5">RESET</code> 을 입력하세요.
              </Label>
              <Input
                id="confirm"
                name="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="RESET"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="destructive"
                disabled={resetPending || confirm !== "RESET"}
              >
                {resetPending ? "초기화 중..." : "전체 삭제"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> 3. CSV 가져오기
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            앞서 다운로드한 CSV 들을 선택해 업로드합니다. 비워둔 항목은 건너뜁니다. 의존성 순서
            (groups → accounts → holdings → transactions → dividends) 로 자동 처리됩니다.
          </p>

          {importState.error && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {importState.error}
            </div>
          )}
          {importState.message && (
            <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              {importState.message}
            </div>
          )}

          <form ref={importFormRef} onSubmit={onImportSubmit} className="space-y-3">
            {EXPORTS.map(({ type, label }) => (
              <div key={type} className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
                <Label htmlFor={`file-${type}`} className="text-sm">
                  {label}
                </Label>
                <Input
                  id={`file-${type}`}
                  type="file"
                  name={type}
                  accept=".csv,text/csv"
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => importFormRef.current?.reset()}
                disabled={importPending}
              >
                선택 초기화
              </Button>
              <Button type="submit" disabled={importPending}>
                {importPending ? "Import 중..." : "Import 실행"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
