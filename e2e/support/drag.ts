/**
 * Drags a task card on the board with the mouse, as a person would.
 *
 * The board's lists use SortableJS's pointer fallback (`forceFallback`), which never sees native
 * drag events. It follows mouse moves (pointer events on Chromium; plain mouse events on Safari,
 * where Sortable turns pointer events off), starts the drag a frame after the first move past
 * the tolerance, and only finds the list under the pointer on a 50 ms timer
 * (`_emulateDragOver`). Stepped moves followed straight by `mouse.up()` can all land between two
 * ticks: the drop then happens before Sortable ever saw the pointer over the target, and the card
 * stays where it was. That was WebKit's drag flake. So the drag waits, holding the pointer over
 * the target, until Sortable has moved the dragged card (marked with the ghost class) into the
 * target list, and only then lets go.
 */
import { expect, type Locator, type Page } from '@playwright/test';

/** The class TaskColumn gives the card being dragged (Sortable's `ghostClass`). */
const GHOST = '.task-column__ghost';

export interface DragOptions {
  /** Where to let go over the target: its centre, or just inside its top edge. */
  at?: 'center' | 'top';
  /**
   * The list the card should end up in, which the drag waits for before letting go. Defaults to
   * the target itself, which suits dragging onto a list.
   */
  into?: Locator;
}

export async function dragCard(
  page: Page,
  source: Locator,
  target: Locator,
  { at = 'center', into = target }: DragOptions = {},
): Promise<void> {
  const from = await source.getByTestId('task-title').boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('drag: source or target is not on screen');
  const startX = from.x + Math.min(24, from.width / 2);
  const startY = from.y + from.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Past the 4 px fallback tolerance, then wait for Sortable to start the drag.
  await page.mouse.move(startX + 8, startY + 8, { steps: 4 });
  await expect(page.locator(GHOST)).toHaveCount(1);
  const endX = to.x + to.width / 2;
  const endY = at === 'top' ? to.y + 4 : to.y + to.height / 2;
  await page.mouse.move(endX, endY, { steps: 20 });
  // Hold still over the target until a dragover tick has moved the card into its list.
  await expect(into.locator(GHOST)).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator(GHOST)).toHaveCount(0);
}
