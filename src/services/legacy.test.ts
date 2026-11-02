import { Timestamp, doc } from 'firebase/firestore';
import { describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/firebase';
import { labelFromDoc, notificationFromDoc, taskFromDoc } from './legacy';

/** A reference like the old app stored in a task's `type` list. No network: refs are local. */
const ref = (path: string) => doc(db, path);

describe('taskFromDoc (§10)', () => {
  it("maps a legacy task with 'NA' date and time and type refs", () => {
    const task = taskFromDoc('t1', {
      uid: 'alice',
      title: 'Old task',
      description: 'notes',
      status: 'todo',
      indefinite: true,
      date: 'NA',
      time: 'NA',
      type: [ref('types/a')],
    });

    expect(task).toMatchObject({
      id: 't1',
      uid: 'alice',
      title: 'Old task',
      description: 'notes',
      status: 'todo',
      date: null,
      time: null,
      labelIds: ['a'],
      indefinite: true,
      remindAt: null,
      reminded: false,
    });
  });

  it('gives empty labels and description when type and description are missing', () => {
    const task = taskFromDoc('t2', {
      uid: 'alice',
      title: 'Bare',
      status: 'done',
      indefinite: false,
      date: '2026-11-03',
      time: '09:00',
    });

    expect(task.labelIds).toEqual([]);
    expect(task.description).toBe('');
    expect(task.date).toBe('2026-11-03');
    expect(task.time).toBe('09:00');
    expect(task.status).toBe('done');
  });

  it('assumes Asia/Kolkata for a task saved before time zones were stored (§11.3)', () => {
    expect(taskFromDoc('t3', { date: '2026-11-03', time: '09:00' }).timeZone).toBe('Asia/Kolkata');
    expect(taskFromDoc('t4', { timeZone: 'Not/AZone' }).timeZone).toBe('Asia/Kolkata');
  });

  it('reads the new shape, with labelIds, timeZone and a remindAt Timestamp', () => {
    const remindAt = new Date('2026-11-03T02:30:00Z');
    const task = taskFromDoc('t5', {
      uid: 'alice',
      title: 'New',
      description: '',
      status: 'todo',
      indefinite: false,
      date: '2026-11-03',
      time: '09:00',
      timeZone: 'America/New_York',
      remindAt: Timestamp.fromDate(remindAt),
      reminded: true,
      labelIds: ['a', 'b', 'a', 7, ''],
    });

    expect(task.timeZone).toBe('America/New_York');
    expect(task.remindAt?.toISOString()).toBe(remindAt.toISOString());
    expect(task.reminded).toBe(true);
    expect(task.labelIds).toEqual(['a', 'b']);
  });

  it('survives a document with wrong field types', () => {
    const task = taskFromDoc('t6', {
      uid: 5,
      title: { evil: true },
      description: null,
      status: 'archived',
      date: '2026-02-30',
      time: '25:00',
      type: 'types/a',
      remindAt: 'tomorrow',
    });

    expect(task).toMatchObject({
      uid: '',
      title: '',
      description: '',
      status: 'todo',
      indefinite: true,
      date: null,
      time: null,
      labelIds: [],
      remindAt: null,
    });
  });
});

describe('notificationFromDoc (D5)', () => {
  it('parses the old IST toLocaleString text when createdAt is missing', () => {
    const n = notificationFromDoc('n1', {
      uid: 'alice',
      title: 'Task reminder',
      body: 'Upcoming task',
      timestamp: '11/2/2026, 3:30:00 PM',
    });

    expect(Number.isNaN(n.createdAt.getTime())).toBe(false);
    // The old function wrote India time: 15:30 IST is 10:00 UTC.
    expect(n.createdAt.toISOString()).toBe('2026-11-02T10:00:00.000Z');
    expect(n.taskId).toBeNull();
  });

  it('gives epoch 0 for an unreadable timestamp, without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const n = notificationFromDoc('n2', { uid: 'alice', timestamp: 'not a date' });

    expect(n.createdAt.getTime()).toBe(0);
    expect(warn).toHaveBeenCalledWith('[notifications] unreadable timestamp on', 'n2');
  });

  it('prefers a createdAt Timestamp', () => {
    const createdAt = new Date('2026-11-02T03:00:00Z');
    const n = notificationFromDoc('n3', {
      uid: 'alice',
      title: 't',
      body: 'b',
      taskId: 't1',
      createdAt: Timestamp.fromDate(createdAt),
      timestamp: '1/1/2020, 1:00:00 AM',
    });

    expect(n.createdAt.toISOString()).toBe(createdAt.toISOString());
    expect(n.taskId).toBe('t1');
  });
});

describe('labelFromDoc', () => {
  it('reads a label and tolerates missing fields', () => {
    expect(labelFromDoc('a', { uid: 'alice', label: 'Work', color: '#f00' })).toEqual({
      id: 'a',
      uid: 'alice',
      label: 'Work',
      color: '#f00',
    });
    expect(labelFromDoc('b', {})).toEqual({ id: 'b', uid: '', label: '', color: '' });
  });
});
