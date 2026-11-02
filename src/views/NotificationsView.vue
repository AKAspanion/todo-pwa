<script setup lang="ts">
/**
 * The notifications screen (spec §3, item 7): the push toggle for this device (D19, P1) and the
 * user's reminder notifications, newest first, with times in the browser's time zone (D5). Each
 * can be deleted; a failed delete keeps it. A failed load keeps what is shown, with Retry (D12).
 *
 * The toggle is the only place that asks for notification permission, and only from a click.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessaging } from '@/pwa/useMessaging';
import { useNotificationsStore } from '@/stores/notifications';
import { errorCode, useSessionStore } from '@/stores/session';
import { useUiStore } from '@/stores/ui';
import type { AppNotification } from '@/types/models';

const { t, locale } = useI18n();
const session = useSessionStore();
const notifications = useNotificationsStore();
const ui = useUiStore();
const { supported, permission, enabled, enable, disable } = useMessaging();

const toggling = ref(false);
const deleting = ref<string | null>(null);

/** Intl locale tags for dates: Hindi digits and month names, or US English. */
const dateTimeFormat = computed(
  () =>
    new Intl.DateTimeFormat(locale.value === 'hi' ? 'hi-IN' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
);

/** The time in the browser's zone; nothing for an old notification whose time couldn't be read. */
function shownTime(n: AppNotification): string {
  return n.createdAt.getTime() > 0 ? dateTimeFormat.value.format(n.createdAt) : '';
}

const pushHint = computed(() => {
  if (!supported.value) return t('notifications.push.unsupported');
  if (permission.value === 'denied') return t('notifications.push.blocked');
  return t('notifications.push.hint');
});

const showSkeleton = computed(() => notifications.loading && notifications.items.length === 0);
const showEmpty = computed(
  () => !notifications.loading && !notifications.error && notifications.items.length === 0,
);

// Follows the signed-in user (doing nothing when already started), so the list loads once known.
session.start();
watch(
  () => session.user?.uid,
  (uid) => {
    if (uid) void notifications.load();
  },
  { immediate: true },
);

/** Runs only from the switch's own change, a user gesture (P1). */
async function onToggle(value: boolean | null): Promise<void> {
  if (toggling.value || !supported.value) return;
  toggling.value = true;
  try {
    if (value) {
      const result = await enable();
      if (result === 'error') ui.showSnack(t('notifications.push.enableFailed'));
    } else {
      try {
        await disable();
      } catch (error) {
        console.warn('[notifications] turning push off failed:', errorCode(error));
        ui.showSnack(t('notifications.push.disableFailed'));
      }
    }
  } finally {
    toggling.value = false;
  }
}

async function remove(n: AppNotification): Promise<void> {
  if (deleting.value) return;
  deleting.value = n.id;
  try {
    await notifications.remove(n.id);
  } catch (error) {
    console.warn('[notifications] delete failed:', errorCode(error));
    ui.showSnack(t('notifications.list.deleteFailed'));
  } finally {
    deleting.value = null;
  }
}
</script>

<template>
  <v-container class="notifications">
    <h1 class="text-h6 mb-4">{{ t('common.screens.notification') }}</h1>

    <v-card variant="outlined" class="mb-6">
      <v-card-text>
        <v-switch
          :model-value="enabled"
          :label="t('notifications.push.label')"
          :messages="pushHint"
          :disabled="!supported || toggling"
          :loading="toggling"
          color="primary"
          inset
          data-testid="push-toggle"
          @update:model-value="onToggle"
        />
      </v-card-text>
    </v-card>

    <h2 class="text-subtitle-1 mb-2">{{ t('notifications.list.heading') }}</h2>

    <v-alert v-if="notifications.error" type="error" variant="tonal" density="compact" class="mb-3">
      {{ t('notifications.list.loadFailed') }}
      <template #append>
        <v-btn variant="text" color="error" size="small" @click="notifications.load()">
          {{ t('notifications.list.retry') }}
        </v-btn>
      </template>
    </v-alert>

    <div v-if="showSkeleton" role="status" :aria-label="t('notifications.list.loading')">
      <v-skeleton-loader v-for="i in 3" :key="i" type="list-item-two-line" class="mb-2" />
    </div>

    <v-card v-else-if="showEmpty" variant="outlined" class="pa-4">
      <div class="text-subtitle-2">{{ t('notifications.list.empty') }}</div>
      <div class="text-body-2 text-medium-emphasis">{{ t('notifications.list.emptyHint') }}</div>
    </v-card>

    <ul v-else class="notification-list">
      <v-card
        v-for="n in notifications.items"
        :key="n.id"
        tag="li"
        color="primary"
        variant="tonal"
        class="mb-3"
        data-testid="notification"
        :data-notification-id="n.id"
      >
        <v-card-item>
          <v-card-title class="text-subtitle-1 notification-text">{{ n.title }}</v-card-title>
          <v-card-subtitle v-if="shownTime(n)">
            <time :datetime="n.createdAt.toISOString()">{{ shownTime(n) }}</time>
          </v-card-subtitle>
          <template #append>
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              :aria-label="t('notifications.list.delete')"
              :loading="deleting === n.id"
              :disabled="deleting !== null"
              @click="remove(n)"
            />
          </template>
        </v-card-item>
        <v-card-text v-if="n.body" class="notification-text">{{ n.body }}</v-card-text>
      </v-card>
    </ul>
  </v-container>
</template>

<style scoped>
.notifications {
  max-width: 760px;
}

.notification-list {
  list-style: none;
  padding: 0;
}

.notification-text {
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
