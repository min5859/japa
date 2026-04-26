// Design Ref: §3 (Data Flow) + §6 (Security Layers)
// Plan SC: SC-2/3/4/5

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { accountFormSchema, type AccountFormInput } from "@/lib/accounts/schema";

type ActionResult = { ok: true } | { ok: false; error: string };

async function getAuthedUserId(): Promise<
  | { ok: true; userId: string; client: Awaited<ReturnType<typeof createSupabaseServerClient>> }
  | { ok: false; error: string }
> {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return { ok: false, error: "Unauthorized" };
  }

  return { ok: true, userId: user.id, client };
}

export async function createAccount(input: AccountFormInput): Promise<ActionResult> {
  const parsed = accountFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  const auth = await getAuthedUserId();
  if (!auth.ok) return auth;

  const { name, ...rest } = parsed.data;
  const { error } = await auth.client.from("accounts").insert({
    user_id: auth.userId,
    ...rest,
    name: name && name.length > 0 ? name : null,
  });

  if (error) {
    console.error("[accounts/createAccount] insert failed:", error.message);
    return { ok: false, error: "계좌 생성에 실패했습니다." };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  redirect("/accounts");
}

export async function updateAccount(
  id: string,
  input: AccountFormInput,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Missing id" };

  const parsed = accountFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  const auth = await getAuthedUserId();
  if (!auth.ok) return auth;

  const { name, ...rest } = parsed.data;
  const { error } = await auth.client
    .from("accounts")
    .update({
      ...rest,
      name: name && name.length > 0 ? name : null,
    })
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) {
    console.error("[accounts/updateAccount] update failed:", error.message);
    return { ok: false, error: "계좌 수정에 실패했습니다." };
  }

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${id}/edit`);
  revalidatePath("/dashboard");
  redirect("/accounts");
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Missing id" };

  const auth = await getAuthedUserId();
  if (!auth.ok) return auth;

  const { error } = await auth.client
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) {
    console.error("[accounts/deleteAccount] delete failed:", error.message);
    return { ok: false, error: "계좌 삭제에 실패했습니다." };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true };
}
