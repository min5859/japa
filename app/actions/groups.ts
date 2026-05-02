"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const GroupSchema = z.object({
  name: z.string().min(1, "그룹 이름은 필수입니다"),
  description: z.string().optional(),
  displayOrder: z.coerce.number().int().default(0),
  accountIds: z.array(z.string()).default([])
});

export type GroupActionState = { error: string | null };

function parseFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    displayOrder: formData.get("displayOrder") || "0",
    accountIds: formData.getAll("accountIds").map(String).filter(Boolean)
  };
}

export async function createGroup(
  prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const parsed = GroupSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { accountIds, ...data } = parsed.data;
  await prisma.accountGroup.create({
    data: {
      ...data,
      accounts: accountIds.length ? { connect: accountIds.map((id) => ({ id })) } : undefined
    }
  });

  revalidatePath("/groups");
  revalidatePath("/accounts");
  redirect("/groups");
}

export async function updateGroup(
  id: string,
  prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const parsed = GroupSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { accountIds, ...data } = parsed.data;
  await prisma.accountGroup.update({
    where: { id },
    data: {
      ...data,
      accounts: { set: accountIds.map((aid) => ({ id: aid })) }
    }
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${id}`);
  revalidatePath("/accounts");
  redirect("/groups");
}

export async function deleteGroup(id: string) {
  await prisma.accountGroup.delete({ where: { id } });
  revalidatePath("/groups");
  revalidatePath("/accounts");
  redirect("/groups");
}
