// Plan Ref: yahoo-quotes §4, §7
// service role 클라이언트 — price_cache/fx_rates 같은 RLS 우회가 필요한
// "사용자 무관 공유 캐시" 테이블 쓰기 전용. 사용자 데이터에는 절대 사용 금지.

import "server-only";
import { createClient } from "@supabase/supabase-js";

// admin client가 다루는 캐시 테이블만 minimal하게 정의 (사용자 데이터는 절대 admin으로 다루지 않음)
type CacheDatabase = {
  public: {
    Tables: {
      price_cache: {
        Row: {
          ticker: string;
          date: string;
          close_price: number;
          currency: string;
          source: string;
          fetched_at: string;
        };
        Insert: {
          ticker: string;
          date: string;
          close_price: number;
          currency: string;
          source?: string;
          fetched_at?: string;
        };
        Update: Partial<{
          ticker: string;
          date: string;
          close_price: number;
          currency: string;
          source: string;
          fetched_at: string;
        }>;
        Relationships: [];
      };
      fx_rates: {
        Row: {
          date: string;
          base: string;
          quote: string;
          rate: number;
          fetched_at: string;
        };
        Insert: {
          date: string;
          base?: string;
          quote: string;
          rate: number;
          fetched_at?: string;
        };
        Update: Partial<{
          date: string;
          base: string;
          quote: string;
          rate: number;
          fetched_at: string;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let cached: ReturnType<typeof createClient<CacheDatabase>> | null = null;

export function createSupabaseAdminClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다 (.env.local 확인)",
    );
  }

  cached = createClient<CacheDatabase>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
