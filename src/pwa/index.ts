import { unregisterLegacyWorkers } from './legacyWorkers';
import { useMessaging } from './useMessaging';
import { useUpdatePrompt } from './useUpdatePrompt';

/**
 * Starts the PWA features: the service worker with its update prompt (D20), and push messaging
 * with its single foreground handler (P2). It also unregisters the old app's service workers
 * (security review C1, I2). App.vue calls it once, on mount; a second call does nothing more (the
 * legacy scan finds nothing left to remove). It never asks for notification permission (P1).
 */
export function setupPwa(): void {
  void unregisterLegacyWorkers();
  useUpdatePrompt();
  useMessaging();
}
