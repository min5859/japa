import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshMarketHistory } from "@/lib/market";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Date whose UTC fields read as the current KST clock fields. */
function nowKST(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const kst = nowKST();
  const isJanFirst = kst.getUTCMonth() === 0 && kst.getUTCDate() === 1;

  const ran: string[] = [];

  await refreshMarketHistory();
  ran.push("marketHistory");

  if (isJanFirst) {
    const reset = await prisma.account.updateMany({
      where: { isTaxAdvantaged: true },
      data: { contributionYTD: 0 }
    });
    ran.push(`contributionYTDReset(${reset.count})`);
  }

  return NextResponse.json({ ok: true, ran });
}
