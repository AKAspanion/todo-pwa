/**
 * Which Firebase `authDomain` the app uses (review I5). Google sign-in by redirect keeps its result
 * in the auth handler's storage, at `https://<authDomain>/__/auth/handler`; on another origin than
 * the page, browsers that block third-party storage drop it and the user comes back signed out.
 * Every Hosting domain of the app serves that handler itself, so on one of them the app uses its
 * own host and the handler is same-origin.
 */

/** The lower-cased host names in a comma-separated list, without blanks. */
function hostList(list: string | undefined): string[] {
  return (list ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== '');
}

/**
 * `pageHost` (`location.host`) when it is one of `appDomains` (the comma-separated
 * `VITE_FIREBASE_AUTH_DOMAINS`), else `fallback` (`VITE_FIREBASE_AUTH_DOMAIN`). Only a whole host
 * name matches, so a look-alike host never becomes the auth domain.
 */
export function pickAuthDomain(
  pageHost: string,
  appDomains: string | undefined,
  fallback: string,
): string {
  const host = pageHost.trim().toLowerCase();
  return host !== '' && hostList(appDomains).includes(host) ? host : fallback;
}
