import { updateUserTimezone } from "@pair/db";

// Valida que `value` sea una zona IANA real antes de guardarla. Usado por login y signup.
export async function captureTimezone(userId: string, value: FormDataEntryValue | null): Promise<void> {
  if (typeof value !== "string" || !value) return;

  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
  } catch {
    return;
  }

  await updateUserTimezone(userId, value);
}
