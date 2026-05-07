export function getOwnerEmail(): string {
  const email = process.env.OWNER_EMAIL;
  if (!email) throw new Error("OWNER_EMAIL is not set");
  return email.toLowerCase();
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === getOwnerEmail();
}
