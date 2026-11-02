<script setup lang="ts">
/**
 * A task description as Markdown. `renderMarkdown` turns raw HTML into text and sanitises the
 * result with DOMPurify (S3), so the HTML set here can carry no script, image or event handler.
 */
import { computed } from 'vue';
import { renderMarkdown } from '@/lib/markdown';

const props = defineProps<{ source: string }>();

const html = computed(() => renderMarkdown(props.source));
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- sanitised by renderMarkdown (S3) -->
  <div class="markdown-view" v-html="html"></div>
</template>

<style scoped>
.markdown-view {
  overflow-wrap: anywhere;
}
.markdown-view :deep(p),
.markdown-view :deep(ul),
.markdown-view :deep(ol) {
  margin: 0;
}
.markdown-view :deep(ul),
.markdown-view :deep(ol) {
  padding-left: 1.25em;
}
.markdown-view :deep(a) {
  color: inherit;
}
</style>
