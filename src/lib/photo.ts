/** The profile photo of an account, safe to show: the URL comes from the account, which anyone can set. */

/** Whether `raw`, trimmed, is an https URL. Logs nothing, so a field can check it as the user types. */
export function isHttpsUrl(raw: string): boolean {
  try {
    return new URL(raw.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

/** `raw` when it is an https URL, else null (and a warning that names no part of the value). */
export function httpsPhotoUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (isHttpsUrl(raw)) return new URL(raw.trim()).href;
  console.warn('[auth] ignored a profile photo that is not an https URL');
  return null;
}
