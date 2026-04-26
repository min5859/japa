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

## Notes on Agent Compatibility

- `AGENTS.md` is a good shared project-instruction file for coding agents.
- Claude, Codex, and similar coding agents can all use it as a project guidance document.
- `AGENTS.md` is also the more common convention for cross-agent repository guidance.
- If needed later, this file can be adapted for tool-specific conventions.
