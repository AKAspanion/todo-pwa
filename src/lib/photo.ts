/** The profile photo of an account, safe to show: the URL comes from the account, which anyone can set. */

/** `raw` when it is an https URL, else null (and a warning that names no part of the value). */
export function httpsPhotoUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:') return url.href;
  } catch {
    // Not a URL at all: handled with the other rejections below.
  }
  console.warn('[auth] ignored a profile photo that is not an https URL');
  return null;
}
