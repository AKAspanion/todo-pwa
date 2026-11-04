import type { Label } from '@/types/models';

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** A label's colour when it is a hex colour Vuetify can use; anything else (old or bad data) is none. */
export function safeColor(color: string | undefined): string | undefined {
  return color !== undefined && HEX_COLOR.test(color) ? color : undefined;
}

/**
 * The labels behind a task's label ids, in the task's order (D6): an id with no label, such as a
 * deleted one, is left out, and the ids themselves are never changed.
 */
export function resolveLabels(labelIds: readonly string[], labels: readonly Label[]): Label[] {
  const byId = new Map(labels.map((label) => [label.id, label]));
  return labelIds.flatMap((id) => {
    const label = byId.get(id);
    return label ? [label] : [];
  });
}

/**
 * The text colour the old app put on a label colour: dark grey on a light colour, white on a dark
 * one or on none (the old `getTextColorByBg`, which read only six-digit hex colours).
 */
export function textColorFor(color: string | undefined): '#333333' | '#ffffff' {
  const match = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color ?? '');
  if (!match) return '#ffffff';
  const [r, g, b] = [match[1], match[2], match[3]].map((part) => parseInt(part, 16));
  return Math.round((r * 299 + g * 587 + b * 114) / 1000) > 128 ? '#333333' : '#ffffff';
}
