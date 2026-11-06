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
import { useDisplay } from 'vuetify';
import { useMessaging } from '@/pwa/useMessaging';
import { useNotificationsStore } from '@/stores/notifications';
import { errorCode, useSessionStore } from '@/stores/session';
import { useUiStore } from '@/stores/ui';
import type { AppNotification } from '@/types/models';

const { t, locale } = useI18n();
const session = useSessionStore();
const notifications = useNotificationsStore();
const ui = useUiStore();
const { xs } = useDisplay();
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

/** Under the list when push can be used: what the switch does, or why it can't be turned on. */
const pushHint = computed(() => {
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
  <div class="notifications">
    <v-card flat tile class="old-app-card">
      <div class="old-app-wrapper">
        <div class="notifications__content px-4 px-sm-5 pb-4">
          <div class="px-1 px-sm-3">
            <div class="d-flex align-center justify-space-between pb-1">
              <h1 class="text-overline text-left">{{ t('notifications.list.heading') }}</h1>
              <v-switch
                :model-value="enabled"
                :label="t('notifications.push.label')"
                :disabled="!supported || toggling"
                :loading="toggling"
                color="primary"
                density="compact"
                hide-details
                class="notifications__toggle flex-grow-0"
                data-testid="push-toggle"
                @update:model-value="onToggle"
              />
            </div>

            <v-card
              v-if="!supported"
              variant="outlined"
              width="100%"
              class="text-left pa-4 my-3"
              data-testid="push-hint"
            >
              <div class="text-subtitle-2">{{ t('notifications.push.unsupported') }}</div>
            </v-card>

            <v-card
              v-if="notifications.error"
              variant="outlined"
              width="100%"
              class="text-left pa-4 my-3"
              role="alert"
            >
              <div class="d-flex align-center justify-space-between">
                <div class="text-subtitle-2">{{ t('notifications.list.loadFailed') }}</div>
                <v-btn variant="text" size="small" @click="notifications.load()">
                  {{ t('notifications.list.retry') }}
                </v-btn>
              </div>
            </v-card>

            <div v-if="showSkeleton" role="status" :aria-label="t('notifications.list.loading')">
              <v-skeleton-loader v-for="i in 3" :key="i" type="list-item-two-line" class="mb-2" />
            </div>

            <v-card
              v-else-if="showEmpty"
              variant="outlined"
              width="100%"
              class="text-left pa-4 my-3"
            >
              <div class="text-subtitle-2">{{ t('notifications.list.empty') }}</div>
              <div class="text-caption">{{ t('notifications.list.emptyHint') }}</div>
            </v-card>

            <ul v-else class="notification-list">
              <v-card
                v-for="n in notifications.items"
                :key="n.id"
                tag="li"
                color="primary"
                width="100%"
                elevation="2"
                class="text-left pa-4 mt-3"
                data-testid="notification"
                :data-notification-id="n.id"
              >
                <div class="d-flex align-center justify-space-between">
                  <div class="notification-text">
                    <div class="text-subtitle-2">
                      {{ n.title }}
                      <time
                        v-if="shownTime(n)"
                        class="text-caption notification-time ml-2"
                        :datetime="n.createdAt.toISOString()"
                        >{{ shownTime(n) }}</time
                      >
                    </div>
                    <div v-if="n.body" class="text-caption">{{ n.body }}</div>
                  </div>
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="white"
                    :size="xs ? 'small' : 'default'"
                    density="comfortable"
                    :aria-label="t('notifications.list.delete')"
                    :loading="deleting === n.id"
                    :disabled="deleting !== null"
                    @click="remove(n)"
                  />
                </div>
              </v-card>
            </ul>

            <div v-if="supported" class="text-caption text-left mt-3">
              {{ pushHint }}
            </div>
          </div>
        </div>
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.notification-list {
  list-style: none;
  padding: 0;
}

.notification-text {
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}

.notification-time {
  opacity: 0.8;
}

.notifications__toggle {
  margin-top: -6px;
  margin-bottom: -6px;
  --v-input-control-height: 32px;
}

/* The label before the switch, as in the menu and on add task: Vuetify puts it after. */
.notifications__toggle :deep(.v-selection-control) {
  flex-direction: row-reverse;
}
.notifications__toggle :deep(.v-label) {
  font-size: 0.75rem;
  opacity: 1;
  padding-inline: 0 8px;
}
</style>
