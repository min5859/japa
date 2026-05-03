// Single source of truth for AccountGroup: form Zod schema.

import { z } from "zod";

export const groupFormSchema = z.object({
  name: z.string().min(1, "그룹 이름은 필수입니다"),
  description: z.string().optional(),
  displayOrder: z.coerce.number().int().default(0),
  accountIds: z.array(z.string()).default([]),
});

export type GroupFormInput = z.infer<typeof groupFormSchema>;
