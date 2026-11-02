import { useMessaging } from './useMessaging';
import { useUpdatePrompt } from './useUpdatePrompt';

/**
 * Starts the PWA features: the service worker with its update prompt (D20), and push messaging
 * with its single foreground handler (P2). App.vue calls it once, on mount; a second call does
 * nothing more. It never asks for notification permission (P1).
 */
export function setupPwa(): void {
  useUpdatePrompt();
  useMessaging();
}
