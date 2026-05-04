# AGENTS.md

## Project

- **Name:** Personal Asset Dashboard
- **Goal:** 대표님의 흩어진 자산을 한눈에 보기 쉽게 통합 관리하는 개인용 웹앱
- **Deployment:** Vercel
- **Primary User:** 대표님 1인 전용

## Confirmed Decisions

- **Framework:** Next.js
- **Language:** TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Database Platform:** Supabase
- **Database Engine:** PostgreSQL
- **ORM:** Prisma
- **AI Integration:** Gemini API
- **Market Data:** Yahoo Finance free API
- **Data Input:** Manual input only

## Major Requirements

1. Manage multiple scattered accounts on a single page.
2. Categorize and manage accounts by special purpose such as tax-saving accounts.
3. Track dividend and interest income for comprehensive financial income tax management.
4. Track overseas stock capital gains for tax management.
5. Use AI based on asset data for comprehensive financial management support.
6. Use Yahoo Finance as the free stock price source.

## Recommended Additional Features

1. Unified net worth summary
   - total assets
   - cash
   - investments
   - liabilities
   - net worth
2. Tax-advantaged account contribution limit tracking
3. Tax event warnings dashboard
4. Monthly asset snapshot history
5. Target allocation vs current allocation
6. Dividend and interest cashflow view
7. FX impact breakdown for overseas assets
8. Notes per account or holding

## Delivery Principles

- Do not start implementation unless the user explicitly asks to start.
- Prefer phased implementation over broad all-at-once delivery.
- Keep the first release focused on core dashboard, account management, tax tracking, and AI summaries.
- Design for maintainability and personal use, not multi-tenant SaaS complexity.

## Suggested Initial Phases

### Phase 1
- project setup
- base UI shell
- database schema
- account and holding models

### Phase 2
- account CRUD
- holdings CRUD
- unified dashboard summary

### Phase 3
- Yahoo Finance price and FX integration
- valuation updates

### Phase 4
- tax calculations
  - comprehensive financial income tax support
  - overseas stock capital gains tracking

### Phase 5
- Gemini-powered financial analysis and recommendations

### Phase 6
- charts
- monthly snapshots
- polish and deployment finishing

## Working Rules for Agents

- Read this file before making project-level decisions.
- Respect confirmed decisions unless the user changes them.
- Do not replace the chosen stack without clear justification and user approval.
- Keep commits scoped to a single logical unit of change so review is easy.
- Prefer small, reviewable commits over large mixed commits.
- Verify meaningful changes before reporting completion.

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
