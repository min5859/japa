# AGENTS.md

## Project

- **Name:** Personal Asset Dashboard
- **Goal:** 대표님의 흩어진 자산을 한눈에 보기 쉽게 통합 관리하는 개인용 웹앱
- **Deployment:** Vercel
- **Primary User:** 대표님 1인 전용

## Confirmed Decisions

- **Framework:** Next.js 16 (App Router, Turbopack dev)
- **Language:** TypeScript
- **UI:** Tailwind CSS 4 + shadcn/ui
- **Charts:** Recharts
- **Database Platform:** Supabase (PostgreSQL, ap-south-1)
- **ORM:** Prisma 6 (PgBouncer pooled)
- **Validation:** Zod (per-entity schema in `lib/<entity>/schema.ts`, Prisma enum SSOT)
- **Markdown Rendering:** react-markdown + remark-gfm (assistant messages)
- **AI Integration:** Multi-provider LLM (Gemini / OpenAI / Anthropic / DeepSeek) — 환경변수에 키가 있는 provider만 UI 노출. Provider별 default 모델은 `lib/ai/types.ts` 참조, 환경변수(`<PROVIDER>_MODEL`)로 override 가능.
- **Market Data:** Yahoo Finance (yahoo-finance2)
- **Data Input:** Manual input only
- **Auth:** ADMIN_PASSWORD + HMAC SESSION_COOKIE (1인 전용, Vercel 배포 후 Supabase Auth로 전환 검토 — `tasks/plan-2026-05-03-japa-s-features.md` 참조)

## Major Requirements

1. Manage multiple scattered accounts on a single page.
2. Categorize and manage accounts by special purpose such as tax-saving accounts.
3. Track dividend and interest income for comprehensive financial income tax management.
4. Track overseas stock capital gains for tax management.
5. Use AI based on asset data for comprehensive financial management support.
6. Use Yahoo Finance as the free stock price source.

## Implemented Features (current)

- **Pages:** `/` Dashboard, `/accounts`, `/holdings`, `/groups`, `/dividends`, `/quote`, `/market`, `/tax`, `/ai` (분석), `/chat` (재무 상담), `/login`
- **Domain models:** Account, AccountGroup (N:M), Holding, Dividend, PriceCache, MarketIndex, MarketIndexHistory, PortfolioSnapshot, AiAnalysis, ChatThread, ChatMessage
- **AI 분석 (`/ai`):** 4-provider 중 선택, 결과 DB 저장, 이전 분석 히스토리 + 삭제
- **AI 채팅 (`/chat`):** Provider별 어댑터(`lib/ai/providers/*.ts`), 매 메시지마다 최신 포트폴리오 컨텍스트를 system prompt로 주입, 스레드/메시지 영구 저장, 마크다운(GFM 표 포함) 렌더링
- **Cron 자동화 (`/api/cron/daily`):** 매일 22:00 UTC — 시세·지수·지수 history 갱신 / 매월 1일 스냅샷 / 매년 1/1 contributionYTD 리셋
- **Export:** accounts/holdings/dividends/snapshots CSV (`/api/export/[type]`)
- **Sidebar layout:** 데스크톱 고정 사이드바 + 모바일 슬라이드 오버 (`components/layout/app-shell.tsx`)

## Recommended Additional Features

- ✅ Unified net worth summary (총자산/현금/투자/부채/순자산)
- ✅ Tax-advantaged account contribution limit tracking
- ✅ Tax event warnings dashboard
- ✅ Monthly asset snapshot history
- ⬜ Target allocation vs current allocation (`tasks/todo-2026-05-03.md` backlog)
- ✅ Dividend and interest cashflow view
- ✅ FX impact breakdown for overseas assets
- ✅ Notes per account or holding

## Delivery Principles

- Do not start implementation unless the user explicitly asks to start.
- Prefer phased implementation over broad all-at-once delivery.
- Design for maintainability and personal use, not multi-tenant SaaS complexity.
- 추가 기능 후보는 `tasks/todo-2026-05-03.md` (backlog)와 `tasks/plan-2026-05-03-japa-s-features.md`(인증·암호화·Zod 통합 계획)를 참조.

## Working Rules for Agents

- Read this file before making project-level decisions.
- Respect confirmed decisions unless the user changes them.
- Do not replace the chosen stack without clear justification and user approval.
- Verify meaningful changes before reporting completion (`npm run typecheck`).
- DB write는 server action 또는 API route에서만. Prisma Decimal은 `toNumber()` (`lib/utils.ts`) 사용.
- 라벨/옵션은 entity별 `lib/<entity>/schema.ts` 또는 공유 enum용 `lib/labels.ts`에 둔다 (단일 진실 원천).
- 폼 검증은 entity schema의 Zod 스키마를 server action·client 양쪽에서 import.

### Commit Message Format

- Subject: Conventional Commits prefix (`feat:`/`fix:`/`chore:`/`docs:`/`refactor:`/`test:`/`perf:`), 영문, 70자 이하. scope는 필요 시 `feat(chat):` 형태로.
- Body 필수: **무엇을** 했는지가 아니라 **왜** 필요했는지(원인·맥락·대안·미루는 작업)를 한국어로 적는다.
- AI 도구로 작성한 커밋은 `Co-Authored-By: <model> <noreply@anthropic.com>` trailer를 추가한다.

### Commit Splitting Rules

- **한 커밋 = 한 논리적 단위.** 변경 사유가 둘 이상이면 분리한다.
  - 분리 예: 모델 default 변경 + 새 기능 → 두 커밋
  - 분리 예: 버그 수정 + 무관한 리팩터링 → 두 커밋
  - 분리 예: 계획 문서 추가 + 그 계획의 첫 구현 → 두 커밋 (docs + feat/refactor)
- **묶어도 되는 경우.** 같은 작업 흐름에서 함께 발생하면 한 커밋 OK.
  - 예: 신규 모델 + 마이그레이션 + server action + UI (한 기능을 위한 풀 스택 변경)
  - 예: deps 추가(`package.json`/`package-lock.json`) + 그 deps를 쓰는 코드
- **자동 생성 파일은 staging에서 제외한다.** 작업과 무관하게 자동 갱신되는 파일은 본 커밋에 섞지 않고 별도 또는 다음 작업에 묶는다.
  - 대상 예: `next-env.d.ts`, `.next/types/*`, `tsconfig.tsbuildinfo`
- **DB 스키마 변경과 사용 코드는 같이 묶는다.** 마이그레이션만 먼저 커밋하면 중간 상태가 깨지므로 prisma migration + 그 컬럼을 쓰는 코드를 한 커밋에.
- **`git add .` / `git add -A` 금지.** 의도한 파일/디렉터리를 명시적으로 add 한다.

## Notes on Agent Compatibility

- `AGENTS.md` is a good shared project-instruction file for coding agents.
- Claude, Codex, and similar coding agents can all use it as a project guidance document.
- `AGENTS.md` is also the more common convention for cross-agent repository guidance.
- If needed later, this file can be adapted for tool-specific conventions.
