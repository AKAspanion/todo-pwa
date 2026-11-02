import { defineStore } from 'pinia';
import { createLabel, listLabels } from '@/services/labels';
import type { Label } from '@/types/models';
import { currentUid, errorCode, requireUid } from './session';

interface LabelsState {
  labels: Label[];
  loading: boolean;
  error: string | null;
}

/**
 * The user's labels, loaded once and joined to tasks by id (D6): a task's label id with no
 * label here is simply not shown, and nothing stored changes.
 */
export const useLabelsStore = defineStore('labels', {
  state: (): LabelsState => ({ labels: [], loading: false, error: null }),
  getters: {
    byId: (state): Record<string, Label> => {
      const byId: Record<string, Label> = Object.create(null) as Record<string, Label>;
      for (const label of state.labels) byId[label.id] = label;
      return byId;
    },
  },
  actions: {
    /** On failure the labels already shown stay, and `error` is 'load-failed' (D12). */
    async load(): Promise<void> {
      const uid = currentUid();
      if (!uid) return;
      this.loading = true;
      this.error = null;
      try {
        const labels = await listLabels(uid);
        if (currentUid() === uid) this.labels = labels;
      } catch (error) {
        console.warn('[labels] load failed:', errorCode(error));
        if (currentUid() === uid) this.error = 'load-failed';
      } finally {
        this.loading = false;
      }
    },

    /** Saves a label (rejecting with 'label/invalid-name' outside 1–30 characters, D15). */
    async add(name: string, color: string): Promise<Label> {
      const uid = requireUid();
      const label = await createLabel(uid, name, color);
      if (currentUid() === uid) this.labels.push(label);
      return label;
    },
  },
});
