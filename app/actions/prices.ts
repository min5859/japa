"use server";

import { revalidatePath } from "next/cache";
import { refreshAllPrices } from "@/lib/market";

export async function refreshPrices(): Promise<{ updated: number }> {
  const result = await refreshAllPrices();
  revalidatePath("/", "layout");
  return result;
}
