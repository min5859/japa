# Personal Asset Dashboard

흩어진 개인 자산을 한 페이지에서 통합 관리하는 1인 전용 웹 대시보드.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Recharts |
| Database | Supabase (PostgreSQL) |
| ORM | Prisma |
| AI | Google Gemini API |
| Market Data | Yahoo Finance (`yahoo-finance2`) |
| Deployment | Vercel |

## 로컬 셋업

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사해 `.env`를 만들고 값을 채운다.

```bash
cp .env.example .env
```

필요한 값:

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | Supabase Postgres pooled 연결 문자열 (포트 6543, pgbouncer) |
| `DIRECT_URL` | Supabase Postgres direct 연결 문자열 (포트 5432, 마이그레이션용) |
| `GEMINI_API_KEY` | Google AI Studio에서 발급한 Gemini API 키 |
| `MARKET_DATA_PROVIDER` | 시세 데이터 소스 (기본값: `yahoo-finance`) |

### 3. DB 스키마 적용

```bash
npm run prisma:migrate
```

### 4. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000` 에서 확인.

## 주요 스크립트

| 명령 | 동작 |
| --- | --- |
| `npm run dev` | Prisma client 생성 후 Next.js dev 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 (빌드 후) |
| `npm run lint` | ESLint 실행 |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run prisma:migrate` | DB 마이그레이션 적용 |
| `npm run prisma:studio` | Prisma Studio (DB GUI) 실행 |

## Vercel 배포 메모

1. GitHub repo를 Vercel에 import
2. Vercel Project Settings → Environment Variables 에서 `.env`의 4개 변수를 모두 등록 (Production / Preview / Development 모두 체크)
3. Build Command와 Install Command는 기본값 유지 (`package.json`의 `build` 스크립트가 `prisma generate && next build` 수행)
4. main 브랜치에 push하면 자동 배포

## 디렉터리 구조

```
app/          # Next.js App Router 페이지/라우트
components/   # 공용 React 컴포넌트
lib/          # 비즈니스 로직 (시세, 분석, DB 헬퍼 등)
prisma/       # Prisma 스키마와 마이그레이션
```

## 참고 문서

- [`AGENTS.md`](./AGENTS.md) — 프로젝트 목표, 기능 요구사항, 구현 페이즈 정리
