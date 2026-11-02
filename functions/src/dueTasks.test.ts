import { describe, expect, it } from 'vitest';
import { clipTitle, dueWindow, reminderBody } from './dueTasks';

describe('dueWindow', () => {
  it('is (now, now + 60 min]', () => {
    const window = dueWindow(new Date('2026-11-02T03:00:00Z'));

    expect(window.from.toISOString()).toBe('2026-11-02T03:00:00.000Z');
    expect(window.to.toISOString()).toBe('2026-11-02T04:00:00.000Z');
  });

  it('keeps seconds, so tasks due later in the current minute fall inside it', () => {
    const window = dueWindow(new Date('2026-11-02T03:00:45Z'));

    expect(window.from.toISOString()).toBe('2026-11-02T03:00:45.000Z');
    expect(window.to.toISOString()).toBe('2026-11-02T04:00:45.000Z');
  });

  it('does not share or change the Date it is given', () => {
    const now = new Date('2026-11-02T03:00:00Z');
    const window = dueWindow(now);

    window.from.setUTCHours(0);
    expect(now.toISOString()).toBe('2026-11-02T03:00:00.000Z');
  });
});

describe('reminderBody', () => {
  it('names the task and its time', () => {
    expect(reminderBody('Buy milk', '09:00')).toBe('Upcoming task "Buy milk" at 09:00');
  });
});

describe('clipTitle', () => {
  it('keeps a title of up to 200 characters as it is', () => {
    const title = 'x'.repeat(200);
    expect(clipTitle(title)).toBe(title);
  });

  it('cuts a longer title to 200 characters ending in an ellipsis', () => {
    expect(clipTitle('x'.repeat(201))).toBe(`${'x'.repeat(199)}…`);
  });

  it('never splits a character outside the basic plane', () => {
    const clipped = clipTitle('😀'.repeat(300));
    expect(Array.from(clipped)).toHaveLength(200);
    expect(clipped).toBe(`${'😀'.repeat(199)}…`);
  });
});
