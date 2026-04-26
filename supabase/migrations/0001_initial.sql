-- ============================================================================
-- japa — Initial Schema (Phase 1 MVP)
-- ============================================================================
-- 작성일: 2026-04-26
-- 설계 근거: docs/01-plan/features/db-schema.plan.md
--           docs/02-design/features/db-schema.design.md
-- 보안 리뷰: security-architect (2026-04-26)
--
-- 적용 방법:
--   1. Supabase Dashboard → SQL Editor에 이 파일 전체 내용을 붙여넣기
--   2. RUN 클릭
--   3. Table Editor에서 6개 테이블 생성 확인
--
-- 주의: 이 마이그레이션은 멱등(idempotent)하지 않음. 한 번만 실행.
-- ============================================================================

-- ============================================================================
-- SECTION 1. Helper Functions
-- ============================================================================

-- 1.1 자동 타임스탬프 갱신
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1.2 이메일 Allowlist 검증 (이중 방어)
-- 미들웨어 우회 / service_role 우회 시에도 본인 외 INSERT/UPDATE 차단
CREATE OR REPLACE FUNCTION public.check_owner_allowlist()
RETURNS TRIGGER AS $$
DECLARE
  caller_email text;
BEGIN
  -- service_role 등 auth.uid()가 NULL인 컨텍스트도 차단
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: anonymous context not allowed';
  END IF;

  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email IS NULL OR caller_email NOT IN ('min5859@gmail.com') THEN
    RAISE EXCEPTION 'Unauthorized: email % not in allowlist', COALESCE(caller_email, '(null)');
  END IF;

  -- user_id 필드가 있는 테이블이면 자동으로 본인 user_id 강제 (덮어쓰기 방지)
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Unauthorized: user_id mismatch with auth.uid()';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 2. Tables
-- ============================================================================

-- 2.1 accounts (계좌)
CREATE TABLE public.accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker        text NOT NULL,
  account_type  text NOT NULL CHECK (account_type IN ('general', 'isa', 'pension', 'irp', 'retirement', 'foreign')),
  currency      text NOT NULL DEFAULT 'KRW',
  name          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX accounts_user_id_idx ON public.accounts(user_id);

-- 2.2 holdings (보유종목)
CREATE TABLE public.holdings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  ticker          text NOT NULL,
  market          text NOT NULL CHECK (market IN ('KR', 'US', 'JP', 'OTHER')),
  name            text,
  quantity        numeric(20, 4) NOT NULL DEFAULT 0,
  avg_cost_price  numeric(20, 4) NOT NULL DEFAULT 0,
  cost_currency   text NOT NULL DEFAULT 'KRW',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, ticker)
);
CREATE INDEX holdings_user_id_idx ON public.holdings(user_id);
CREATE INDEX holdings_account_id_idx ON public.holdings(account_id);
CREATE INDEX holdings_ticker_idx ON public.holdings(ticker);

-- 2.3 transactions (거래내역)
CREATE TABLE public.transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id    uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  holding_id    uuid REFERENCES public.holdings(id) ON DELETE SET NULL,
  type          text NOT NULL CHECK (type IN ('buy', 'sell', 'dividend', 'interest', 'fee')),
  quantity      numeric(20, 4),
  price         numeric(20, 4),
  amount        numeric(20, 4) NOT NULL,
  fee           numeric(20, 4) NOT NULL DEFAULT 0,
  tax_withheld  numeric(20, 4) NOT NULL DEFAULT 0,
  currency      text NOT NULL DEFAULT 'KRW',
  trade_date    date NOT NULL,
  memo          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX transactions_account_id_idx ON public.transactions(account_id);
CREATE INDEX transactions_holding_id_idx ON public.transactions(holding_id);
CREATE INDEX transactions_trade_date_idx ON public.transactions(trade_date);

-- 2.4 price_cache (시세 캐시) — 사용자 무관 공유 캐시
CREATE TABLE public.price_cache (
  ticker      text NOT NULL,
  date        date NOT NULL,
  close_price numeric(20, 4) NOT NULL,
  currency    text NOT NULL,
  source      text NOT NULL DEFAULT 'yahoo',
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticker, date)
);

-- 2.5 fx_rates (환율) — 사용자 무관 공유 캐시
CREATE TABLE public.fx_rates (
  date        date NOT NULL,
  base        text NOT NULL DEFAULT 'USD',
  quote       text NOT NULL,
  rate        numeric(20, 6) NOT NULL,
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date, base, quote)
);

-- 2.6 ai_providers (AI 프로바이더 — AES-256-GCM 암호화 키 저장)
CREATE TABLE public.ai_providers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              text NOT NULL CHECK (name IN ('openai', 'anthropic', 'google', 'deepseek')),
  display_name      text,
  api_key_encrypted bytea NOT NULL,
  iv                bytea NOT NULL,
  auth_tag          bytea NOT NULL,
  key_version       int NOT NULL DEFAULT 1,
  model             text,
  is_active         boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
CREATE INDEX ai_providers_user_id_idx ON public.ai_providers(user_id);

-- ============================================================================
-- SECTION 3. Row Level Security (RLS)
-- ============================================================================

-- 사용자 데이터 4개 테이블: 본인 row만 ALL 허용
ALTER TABLE public.accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_providers  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON public.accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_all" ON public.holdings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_all" ON public.transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_all" ON public.ai_providers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 공유 캐시 2개 테이블: 인증 사용자면 SELECT 허용
-- INSERT/UPDATE는 service_role(서버 사이드)만 사용 → 정책 불필요
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_rates    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read" ON public.price_cache
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON public.fx_rates
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- SECTION 4. Triggers
-- ============================================================================

-- 4.1 updated_at 자동 갱신 (사용자 데이터 4개 테이블)
CREATE TRIGGER update_accounts_timestamp     BEFORE UPDATE ON public.accounts     FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_holdings_timestamp     BEFORE UPDATE ON public.holdings     FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_transactions_timestamp BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_ai_providers_timestamp BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- 4.2 이메일 Allowlist 검증 (사용자 데이터 4개 테이블)
CREATE TRIGGER enforce_allowlist_accounts     BEFORE INSERT OR UPDATE ON public.accounts     FOR EACH ROW EXECUTE FUNCTION public.check_owner_allowlist();
CREATE TRIGGER enforce_allowlist_holdings     BEFORE INSERT OR UPDATE ON public.holdings     FOR EACH ROW EXECUTE FUNCTION public.check_owner_allowlist();
CREATE TRIGGER enforce_allowlist_transactions BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.check_owner_allowlist();
CREATE TRIGGER enforce_allowlist_ai_providers BEFORE INSERT OR UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION public.check_owner_allowlist();

-- ============================================================================
-- SECTION 5. Comments (문서화)
-- ============================================================================

COMMENT ON TABLE  public.accounts          IS '계좌 — 증권사·은행별 자산 보관 단위';
COMMENT ON TABLE  public.holdings          IS '보유종목 — 계좌별 종목 + 평균단가';
COMMENT ON TABLE  public.transactions      IS '거래내역 — 매수/매도/배당/이자/수수료';
COMMENT ON TABLE  public.price_cache       IS '시세 캐시 — Yahoo Finance 결과 저장 (사용자 무관)';
COMMENT ON TABLE  public.fx_rates          IS '환율 — USD/KRW 등 (사용자 무관)';
COMMENT ON TABLE  public.ai_providers      IS 'AI 프로바이더 키 — AES-256-GCM 암호화 저장';

COMMENT ON COLUMN public.ai_providers.api_key_encrypted IS 'AES-256-GCM ciphertext (Node.js crypto)';
COMMENT ON COLUMN public.ai_providers.iv                IS '12 bytes initialization vector (NIST 권장)';
COMMENT ON COLUMN public.ai_providers.auth_tag          IS '16 bytes GCM authentication tag';
COMMENT ON COLUMN public.ai_providers.key_version       IS '암호화 키 버전 (회전 시 증가)';

-- ============================================================================
-- 마이그레이션 완료
-- ============================================================================
-- 검증 쿼리:
--
--   -- 1. 테이블 6개 확인
--   SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
--
--   -- 2. RLS 활성 테이블 6개 확인
--   SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=true;
--
--   -- 3. 정책 6개 확인
--   SELECT tablename, policyname FROM pg_policies WHERE schemaname='public';
--
--   -- 4. 트리거 8개 확인 (4 update + 4 allowlist)
--   SELECT trigger_name, event_object_table FROM information_schema.triggers
--     WHERE event_object_schema='public' ORDER BY event_object_table, trigger_name;
-- ============================================================================
