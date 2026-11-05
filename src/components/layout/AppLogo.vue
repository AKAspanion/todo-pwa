<script setup lang="ts">
// The app's logo, the blue double tick, as an inline SVG: three polygons traced from the 512 px icon.
// Decorative (aria-hidden, no title) and #2196F3 in light and dark. Height follows the viewBox ratio.
withDefaults(defineProps<{ size?: number }>(), { size: 72 });
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 104 512 308"
    :width="size"
    aria-hidden="true"
    focusable="false"
  >
    <polygon points="8,286 127.5,405.5 158,375 38.5,255.5" fill="#2196F3" />
    <polygon points="218,254 248.5,284.5 384,149 353.5,118.5" fill="#2196F3" />
    <polygon points="129,286 248,405 504.5,148.5 474,118 248,344 159.5,255.5" fill="#2196F3" />
  </svg>
</template>
