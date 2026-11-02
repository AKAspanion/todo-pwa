import { describe, expect, it } from 'vitest';
import {
  MAX_REMINDERS_PER_OWNER,
  MAX_REMINDERS_PER_RUN,
  capPerOwner,
  clipTitle,
  dueWindow,
  reminderBody,
  settleWithConcurrency,
} from './dueTasks';

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

describe('the per-run limits (review I7)', () => {
  it('reads at most 500 due tasks a run and sends at most 20 reminders per owner', () => {
    expect(MAX_REMINDERS_PER_RUN).toBe(500);
    expect(MAX_REMINDERS_PER_OWNER).toBe(20);
  });
});

describe('capPerOwner', () => {
  const ownerOf = (task: { uid: unknown }) => task.uid;

  it("keeps each owner's first `cap` items, in order, and every other owner's", () => {
    const tasks = [
      { id: 1, uid: 'alice' },
      { id: 2, uid: 'bob' },
      { id: 3, uid: 'alice' },
      { id: 4, uid: 'alice' },
      { id: 5, uid: 'bob' },
      { id: 6, uid: 'carol' },
    ];

    const kept = capPerOwner(tasks, ownerOf, 2);

    expect(kept.map((task) => task.id)).toEqual([1, 2, 3, 5, 6]);
  });

  it('caps the 21st of one owner at the default cap, not another owner', () => {
    const alice = Array.from({ length: 21 }, (_, i) => ({ id: `a${i + 1}`, uid: 'alice' }));
    const tasks = [...alice, { id: 'b1', uid: 'bob' }];

    const kept = capPerOwner(tasks, ownerOf, MAX_REMINDERS_PER_OWNER);

    expect(kept).toHaveLength(21);
    expect(kept.map((task) => task.id)).not.toContain('a21');
    expect(kept.map((task) => task.id)).toContain('b1');
  });

  it('counts odd owner values, such as a number or a missing uid, as owners of their own', () => {
    const tasks = [{ uid: 42 }, { uid: 42 }, { uid: undefined }, { uid: '42' }];

    expect(capPerOwner(tasks, ownerOf, 1)).toEqual([
      { uid: 42 },
      { uid: undefined },
      { uid: '42' },
    ]);
  });

  it('does not change the list it is given', () => {
    const tasks = [{ uid: 'alice' }, { uid: 'alice' }];
    capPerOwner(tasks, ownerOf, 1);
    expect(tasks).toHaveLength(2);
  });
});

describe('settleWithConcurrency', () => {
  /** A promise and the functions that settle it. */
  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  it('never runs more than `limit` at once, and starts the next as soon as one settles', async () => {
    const gates = Array.from({ length: 5 }, () => deferred<number>());
    let running = 0;
    let peak = 0;
    const started: number[] = [];

    const all = settleWithConcurrency([0, 1, 2, 3, 4], 2, async (i) => {
      started.push(i);
      running += 1;
      peak = Math.max(peak, running);
      try {
        return await gates[i].promise;
      } finally {
        running -= 1;
      }
    });

    await Promise.resolve();
    expect(started).toEqual([0, 1]);
    gates[1].resolve(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(started).toEqual([0, 1, 2]);
    gates.forEach((gate, i) => gate.resolve(i));
    await all;
    expect(peak).toBe(2);
    expect(started).toEqual([0, 1, 2, 3, 4]);
  });

  it('settles every item, in input order, though some reject or throw synchronously', async () => {
    const results = await settleWithConcurrency(['ok', 'reject', 'throw', 'ok2'], 2, (item) => {
      if (item === 'throw') throw new Error('sync');
      if (item === 'reject') return Promise.reject(new Error('async'));
      return Promise.resolve(item.toUpperCase());
    });

    expect(results.map((result) => result.status)).toEqual([
      'fulfilled',
      'rejected',
      'rejected',
      'fulfilled',
    ]);
    expect(results[0]).toEqual({ status: 'fulfilled', value: 'OK' });
    expect(results[3]).toEqual({ status: 'fulfilled', value: 'OK2' });
    expect((results[2] as PromiseRejectedResult).reason).toEqual(new Error('sync'));
  });

  it('keeps going while one item never settles', async () => {
    const done: number[] = [];
    const hanging = new Promise<never>(() => undefined);

    void settleWithConcurrency([0, 1, 2, 3], 2, async (i) => {
      if (i === 0) return hanging;
      done.push(i);
      return i;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(done).toEqual([1, 2, 3]);
  });

  it('returns an empty list for no items, and runs one at a time for a limit below 1', async () => {
    expect(await settleWithConcurrency([], 3, async () => 1)).toEqual([]);
    let running = 0;
    let peak = 0;
    await settleWithConcurrency([1, 2, 3], 0, async () => {
      running += 1;
      peak = Math.max(peak, running);
      await Promise.resolve();
      running -= 1;
    });
    expect(peak).toBe(1);
  });
});
