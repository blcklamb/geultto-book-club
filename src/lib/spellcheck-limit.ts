export function isSpellcheckLimitExempt(userId: string) {
  // Local development is intentionally unrestricted for the active tester.
  if (process.env.NODE_ENV === "development") return true;

  return (process.env.SPELLCHECK_UNLIMITED_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}
