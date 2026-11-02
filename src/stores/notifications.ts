import { defineStore } from 'pinia';
import { deleteNotification, listNotifications } from '@/services/notifications';
import type { AppNotification } from '@/types/models';
import { currentUid, errorCode } from './session';

interface NotificationsState {
  items: AppNotification[];
  loading: boolean;
  error: string | null;
}

/** The user's reminder notifications, newest first (D5). */
export const useNotificationsStore = defineStore('notifications', {
  state: (): NotificationsState => ({ items: [], loading: false, error: null }),
  actions: {
    /** On failure the notifications already shown stay, and `error` is 'load-failed' (D12). */
    async load(): Promise<void> {
      const uid = currentUid();
      if (!uid) return;
      this.loading = true;
      this.error = null;
      try {
        const items = await listNotifications(uid);
        if (currentUid() === uid) this.items = items;
      } catch (error) {
        console.warn('[notifications] load failed:', errorCode(error));
        if (currentUid() === uid) this.error = 'load-failed';
      } finally {
        this.loading = false;
      }
    },

    /** Deletes a notification; the list changes only after the delete succeeds. */
    async remove(id: string): Promise<void> {
      await deleteNotification(id);
      this.items = this.items.filter((n) => n.id !== id);
    },
  },
});
