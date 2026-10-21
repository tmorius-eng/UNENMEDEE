/**
 * "Дэмжих": the bank account shown in the header, footer and /support. Stored in app_settings
 * (key "donation") and edited from /admin; the default keeps builds without a database working.
 */
export const DONATION_KEY = "donation";

export interface Donation {
  bank: string;
  /** IBAN (MN + 18 digits) or a plain account number */
  account: string;
  /** optional account holder name */
  holder: string;
}

export const DEFAULT_DONATION: Donation = { bank: "Хаан банк", account: "MN110005005085293387", holder: "" };

export const ACCOUNT_PATTERN = /^(MN\d{18}|\d{8,20})$/;

/** Uppercase, no spaces: what a bank app accepts when pasted. */
export function normalizeAccount(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** "MN110005005085293387" → "MN11 0005 0050 8529 3387" for reading (the copy button copies the raw value). */
export function groupAccount(account: string): string {
  return account.replace(/(.{4})(?=.)/g, "$1 ");
}

/** Stored JSON → Donation, falling back to the default for anything malformed. */
export function parseDonation(raw: string | null | undefined): Donation {
  try {
    const v = JSON.parse(raw ?? "");
    const account = normalizeAccount(String(v?.account ?? ""));
    const bank = String(v?.bank ?? "").trim();
    if (!ACCOUNT_PATTERN.test(account) || !bank || bank.length > 60) return DEFAULT_DONATION;
    return { bank, account, holder: String(v?.holder ?? "").trim().slice(0, 80) };
  } catch {
    return DEFAULT_DONATION;
  }
}
