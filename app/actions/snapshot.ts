"use server";

import { revalidatePath } from "next/cache";
import { createSnapshot } from "@/lib/snapshot";

export async function saveSnapshot(): Promise<{ ok: boolean }> {
  await createSnapshot();
  revalidatePath("/", "layout");
  return { ok: true };
}
