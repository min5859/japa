import { NextResponse, type NextRequest } from "next/server";
import { refreshMarketHistory } from "@/lib/market";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await refreshMarketHistory();
  return NextResponse.json({ ok: true });
}
