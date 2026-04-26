// Design Ref: §1 — 4-Gate Pattern, single source of truth for allowlist

export function getOwnerEmail(): string {
  const email = process.env.OWNER_EMAIL;
  if (!email) {
    throw new Error("OWNER_EMAIL env variable is not set");
  }
  return email.toLowerCase();
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === getOwnerEmail();
}
