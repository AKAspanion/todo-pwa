// @vitest-environment node
/**
 * Firestore security rules (spec S2, S4), run against the Firestore emulator by `npm run test:rules`.
 * The emulator's host and port come from FIRESTORE_EMULATOR_HOST, which `firebase emulators:exec` sets.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const { FieldValue, Timestamp } = firebase.firestore;

type Db = firebase.firestore.Firestore;
type Fields = Record<string, unknown>;

let env: RulesTestEnvironment;

/** A task as the new client writes it (Task 2's `createTask`), owned by `uid`. */
function newTask(uid: string, overrides: Fields = {}): Fields {
  return {
    uid,
    title: 'Buy milk',
    description: 'Two litres',
    status: 'todo',
    indefinite: false,
    date: '2026-11-03',
    time: '09:00',
    timeZone: 'Asia/Kolkata',
    remindAt: Timestamp.fromDate(new Date('2026-11-03T02:30:00Z')),
    reminded: false,
    labelIds: ['l1'],
    ...overrides,
  };
}

/** A task as the old app wrote it: `'NA'` dates, a `type` array of references, an `id` copy and no reminder fields. */
function legacyTask(db: Db, uid: string): Fields {
  return {
    uid,
    id: 'legacy',
    title: 'Old task',
    description: 'From the old app',
    status: 'todo',
    indefinite: true,
    date: 'NA',
    time: 'NA',
    type: [db.doc('types/l1')],
  };
}

function newLabel(uid: string, overrides: Fields = {}): Fields {
  return { uid, label: 'Work', color: '#1976D2', ...overrides };
}

function notification(uid: string): Fields {
  return {
    uid,
    title: 'Buy milk',
    body: 'Due in an hour',
    taskId: 't1',
    createdAt: Timestamp.fromDate(new Date('2026-11-03T02:30:00Z')),
  };
}

function device(uid: string, token: string, overrides: Fields = {}): Fields {
  return {
    uid,
    token,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    updatedAt: FieldValue.serverTimestamp(),
    ...overrides,
  };
}

/** Writes documents with the rules switched off, as the Admin SDK and the old app's data would. */
async function seed(write: (db: Db) => Promise<unknown>): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx: RulesTestContext) => {
    await write(ctx.firestore());
  });
}

function userDb(uid: string): Db {
  return env.authenticatedContext(uid).firestore();
}

function signedOut(): Db {
  return env.unauthenticatedContext().firestore();
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-todo',
    firestore: { rules: readFileSync(join(root, 'firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

describe('signed out', () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await db.doc('tasks/t1').set(newTask('alice'));
      await db.doc('types/l1').set(newLabel('alice'));
      await db.doc('notifications/n1').set(notification('alice'));
      await db.doc('users/alice/devices/tok').set(device('alice', 'tok'));
    });
  });

  it('denies every read on all four paths', async () => {
    const db = signedOut();
    await assertFails(db.doc('tasks/t1').get());
    await assertFails(db.doc('types/l1').get());
    await assertFails(db.doc('notifications/n1').get());
    await assertFails(db.doc('users/alice/devices/tok').get());
    await assertFails(db.collection('tasks').where('uid', '==', 'alice').get());
    await assertFails(db.collection('types').where('uid', '==', 'alice').get());
    await assertFails(db.collection('notifications').where('uid', '==', 'alice').get());
    await assertFails(db.collection('users/alice/devices').get());
  });

  it('denies every create on all four paths', async () => {
    const db = signedOut();
    await assertFails(db.doc('tasks/t2').set(newTask('alice')));
    await assertFails(db.doc('types/l2').set(newLabel('alice')));
    await assertFails(db.doc('notifications/n2').set(notification('alice')));
    await assertFails(db.doc('users/alice/devices/tok2').set(device('alice', 'tok2')));
  });

  it('denies every update on all four paths', async () => {
    const db = signedOut();
    await assertFails(db.doc('tasks/t1').update({ title: 'Changed' }));
    await assertFails(db.doc('types/l1').update({ label: 'Changed' }));
    await assertFails(db.doc('notifications/n1').update({ title: 'Changed' }));
    await assertFails(db.doc('users/alice/devices/tok').set(device('alice', 'tok')));
  });

  it('denies every delete on all four paths', async () => {
    const db = signedOut();
    await assertFails(db.doc('tasks/t1').delete());
    await assertFails(db.doc('types/l1').delete());
    await assertFails(db.doc('notifications/n1').delete());
    await assertFails(db.doc('users/alice/devices/tok').delete());
  });
});

describe('tasks', () => {
  it('lets Alice create, read, list, update and delete her own task', async () => {
    const alice = userDb('alice');
    await assertSucceeds(alice.doc('tasks/t1').set(newTask('alice')));
    await assertSucceeds(alice.doc('tasks/t1').get());
    await assertSucceeds(alice.collection('tasks').where('uid', '==', 'alice').get());
    await assertSucceeds(
      alice.doc('tasks/t1').update({ title: 'Buy oat milk', status: 'done', remindAt: null }),
    );
    await assertSucceeds(alice.doc('tasks/t1').delete());
  });

  describe('owned by Alice', () => {
    beforeEach(async () => {
      await seed((db) => db.doc('tasks/t1').set(newTask('alice')));
    });

    it('denies Bob reading it, or listing her tasks', async () => {
      const bob = userDb('bob');
      await assertFails(bob.doc('tasks/t1').get());
      await assertFails(bob.collection('tasks').where('uid', '==', 'alice').get());
      await assertFails(bob.collection('tasks').get());
    });

    it('denies Bob updating or deleting it', async () => {
      const bob = userDb('bob');
      await assertFails(bob.doc('tasks/t1').update({ title: 'Mine now' }));
      await assertFails(bob.doc('tasks/t1').set(newTask('bob')));
      await assertFails(bob.doc('tasks/t1').delete());
    });

    it('denies Alice moving it to Bob', async () => {
      await assertFails(userDb('alice').doc('tasks/t1').update({ uid: 'bob' }));
    });

    it('denies Alice removing a field the task needs', async () => {
      await assertFails(userDb('alice').doc('tasks/t1').update({ title: FieldValue.delete() }));
    });

    it('denies a legacy `type` that is not a list, or an `id` other than the doc id', async () => {
      const alice = userDb('alice');
      await assertFails(alice.doc('tasks/t1').update({ type: 'l1' }));
      await assertFails(alice.doc('tasks/t1').update({ id: 'other' }));
    });

    it('denies Alice adding a field the app does not know', async () => {
      await assertFails(userDb('alice').doc('tasks/t1').update({ isAdmin: true }));
    });

    it('denies an update with a status other than todo or done', async () => {
      await assertFails(userDb('alice').doc('tasks/t1').update({ status: 'doing' }));
    });

    it('denies an update with a title over 200 characters', async () => {
      await assertFails(
        userDb('alice')
          .doc('tasks/t1')
          .update({ title: 'x'.repeat(201) }),
      );
    });
  });

  it('denies Alice creating a task for Bob', async () => {
    await assertFails(userDb('alice').doc('tasks/t1').set(newTask('bob')));
  });

  it('allows a title of 200 characters and denies 0 or 201', async () => {
    const alice = userDb('alice');
    await assertSucceeds(alice.doc('tasks/t200').set(newTask('alice', { title: 'x'.repeat(200) })));
    await assertFails(alice.doc('tasks/t0').set(newTask('alice', { title: '' })));
    await assertFails(alice.doc('tasks/t201').set(newTask('alice', { title: 'x'.repeat(201) })));
  });

  it('allows a description of 5,000 characters and denies 5,001', async () => {
    const alice = userDb('alice');
    await assertSucceeds(
      alice.doc('tasks/t1').set(newTask('alice', { description: 'x'.repeat(5000) })),
    );
    await assertFails(
      alice.doc('tasks/t2').set(newTask('alice', { description: 'x'.repeat(5001) })),
    );
  });

  it('denies a status other than todo or done', async () => {
    const alice = userDb('alice');
    await assertSucceeds(alice.doc('tasks/t1').set(newTask('alice', { status: 'done' })));
    await assertFails(alice.doc('tasks/t2').set(newTask('alice', { status: 'doing' })));
  });

  it('allows an indefinite task with null date, time and remindAt', async () => {
    await assertSucceeds(
      userDb('alice')
        .doc('tasks/t1')
        .set(newTask('alice', { indefinite: true, date: null, time: null, remindAt: null })),
    );
  });

  it('denies fields of the wrong type or shape on create', async () => {
    const alice = userDb('alice');
    await assertFails(alice.doc('tasks/a').set(newTask('alice', { title: 42 })));
    await assertFails(alice.doc('tasks/b').set(newTask('alice', { description: null })));
    await assertFails(alice.doc('tasks/c').set(newTask('alice', { indefinite: 'no' })));
    await assertFails(alice.doc('tasks/d').set(newTask('alice', { date: 'NA' })));
    await assertFails(alice.doc('tasks/e').set(newTask('alice', { time: '9am' })));
    await assertFails(alice.doc('tasks/f').set(newTask('alice', { timeZone: '' })));
    await assertFails(alice.doc('tasks/g').set(newTask('alice', { remindAt: '2026-11-03' })));
    await assertFails(alice.doc('tasks/h').set(newTask('alice', { reminded: 'false' })));
    await assertFails(alice.doc('tasks/i').set(newTask('alice', { labelIds: 'l1' })));
  });

  it('denies a create with a missing or unknown field', async () => {
    const alice = userDb('alice');
    const withoutReminded = newTask('alice');
    delete withoutReminded.reminded;
    await assertFails(alice.doc('tasks/a').set(withoutReminded));
    await assertFails(alice.doc('tasks/b').set(newTask('alice', { isAdmin: true })));
    await assertFails(alice.doc('tasks/c').set(newTask('alice', { type: [] })));
  });
});

describe('legacy tasks', () => {
  beforeEach(async () => {
    await seed((db) => db.doc('tasks/old').set(legacyTask(db, 'alice')));
  });

  it('are readable by their owner, and by no one else', async () => {
    await assertSucceeds(userDb('alice').doc('tasks/old').get());
    await assertSucceeds(userDb('alice').collection('tasks').where('uid', '==', 'alice').get());
    await assertFails(userDb('bob').doc('tasks/old').get());
  });

  it('are deletable by their owner, and by no one else', async () => {
    await assertFails(userDb('bob').doc('tasks/old').delete());
    await assertSucceeds(userDb('alice').doc('tasks/old').delete());
  });

  it('can be updated into the new shape, dropping `type` and `id`', async () => {
    await assertSucceeds(
      userDb('alice')
        .doc('tasks/old')
        .update({
          title: 'Old task, edited',
          date: null,
          time: null,
          timeZone: 'Asia/Kolkata',
          remindAt: null,
          reminded: false,
          labelIds: ['l1'],
          type: FieldValue.delete(),
          id: FieldValue.delete(),
        }),
    );
  });

  it('can be updated without touching its legacy fields', async () => {
    await assertSucceeds(userDb('alice').doc('tasks/old').update({ status: 'done' }));
  });
});

// The old app, live again while the new one is restyled, writes through these (its src/firebase).
describe('the old app', () => {
  /** `addTask`: the form's task with `uid`, `'NA'` for an indefinite date and time, `type` references. */
  function oldCreate(db: Db, uid: string, overrides: Fields = {}): Fields {
    return {
      uid,
      title: 'Buy milk',
      date: '2026-11-04',
      time: '09:00',
      status: 'todo',
      description: '',
      indefinite: false,
      type: [db.doc('types/l1')],
      ...overrides,
    };
  }

  it('creates a dated task and an indefinite one', async () => {
    const alice = userDb('alice');
    await assertSucceeds(alice.collection('tasks').add(oldCreate(alice, 'alice')));
    await assertSucceeds(
      alice
        .collection('tasks')
        .add(oldCreate(alice, 'alice', { indefinite: true, date: 'NA', time: 'NA', type: [] })),
    );
  });

  it('cannot create a task for Bob, with an unknown field, or with a bad date or title', async () => {
    const alice = userDb('alice');
    await assertFails(alice.collection('tasks').add(oldCreate(alice, 'bob')));
    await assertFails(alice.collection('tasks').add(oldCreate(alice, 'alice', { isAdmin: true })));
    await assertFails(alice.collection('tasks').add(oldCreate(alice, 'alice', { date: 'soon' })));
    await assertFails(alice.collection('tasks').add(oldCreate(alice, 'alice', { title: '' })));
  });

  describe('on its own task', () => {
    beforeEach(async () => {
      await seed((db) => db.doc('tasks/old').set(legacyTask(db, 'alice')));
    });

    it('ticks and unticks it (`updateTask` with only `status`)', async () => {
      await assertSucceeds(userDb('alice').doc('tasks/old').update({ status: 'done' }));
      await assertSucceeds(userDb('alice').doc('tasks/old').update({ status: 'todo' }));
    });

    it('edits it, writing its `id` and `type` back', async () => {
      const alice = userDb('alice');
      await assertSucceeds(
        alice.doc('tasks/old').update({
          ...legacyTask(alice, 'alice'),
          id: 'old',
          title: 'Old task, edited',
          indefinite: false,
          date: '2026-11-05',
          time: '18:30',
          type: [alice.doc('types/l1'), alice.doc('types/l2')],
        }),
      );
    });

    it("edits one of the new app's tasks, adding `id` and `type`", async () => {
      await seed((db) => db.doc('tasks/t1').set(newTask('alice')));
      const alice = userDb('alice');
      await assertSucceeds(
        alice.doc('tasks/t1').update({ id: 't1', type: [alice.doc('types/l1')], date: 'NA' }),
      );
    });

    it('still cannot hand it to Bob, or let Bob edit it', async () => {
      const alice = userDb('alice');
      await assertFails(alice.doc('tasks/old').update({ id: 'old', uid: 'bob' }));
      await assertFails(userDb('bob').doc('tasks/old').update({ status: 'done' }));
    });
  });

  it('creates a label (`addTaskType`)', async () => {
    await assertSucceeds(userDb('alice').collection('types').add(newLabel('alice')));
  });
});

describe('labels (types)', () => {
  it('allow a name of 30 characters and deny 31', async () => {
    const alice = userDb('alice');
    await assertSucceeds(alice.doc('types/l30').set(newLabel('alice', { label: 'x'.repeat(30) })));
    await assertFails(alice.doc('types/l31').set(newLabel('alice', { label: 'x'.repeat(31) })));
  });

  it('deny an empty or blank name', async () => {
    const alice = userDb('alice');
    await assertFails(alice.doc('types/a').set(newLabel('alice', { label: '' })));
    await assertFails(alice.doc('types/b').set(newLabel('alice', { label: '   ' })));
  });

  it('deny a color that is not a short string, and unknown fields', async () => {
    const alice = userDb('alice');
    await assertFails(alice.doc('types/a').set(newLabel('alice', { color: 7 })));
    await assertFails(alice.doc('types/b').set(newLabel('alice', { color: '#'.repeat(33) })));
    await assertFails(alice.doc('types/c').set(newLabel('alice', { isAdmin: true })));
  });

  it('deny Alice creating a label for Bob', async () => {
    await assertFails(userDb('alice').doc('types/l1').set(newLabel('bob')));
  });

  describe('owned by Alice', () => {
    beforeEach(async () => {
      await seed((db) => db.doc('types/l1').set(newLabel('alice')));
    });

    it('are readable, renamable and deletable by Alice', async () => {
      const alice = userDb('alice');
      await assertSucceeds(alice.doc('types/l1').get());
      await assertSucceeds(alice.collection('types').where('uid', '==', 'alice').get());
      await assertSucceeds(alice.doc('types/l1').update({ label: 'Home' }));
      await assertFails(alice.doc('types/l1').update({ label: 'x'.repeat(31) }));
      await assertFails(alice.doc('types/l1').update({ uid: 'bob' }));
      await assertSucceeds(alice.doc('types/l1').delete());
    });

    it('are hidden from Bob, who cannot change them either', async () => {
      const bob = userDb('bob');
      await assertFails(bob.doc('types/l1').get());
      await assertFails(bob.collection('types').where('uid', '==', 'alice').get());
      await assertFails(bob.doc('types/l1').update({ label: 'Mine' }));
      await assertFails(bob.doc('types/l1').delete());
    });
  });
});

describe('notifications', () => {
  beforeEach(async () => {
    await seed((db) => db.doc('notifications/n1').set(notification('alice')));
  });

  it('cannot be created or updated by a client, even its owner', async () => {
    const alice = userDb('alice');
    await assertFails(alice.doc('notifications/n2').set(notification('alice')));
    await assertFails(alice.doc('notifications/n1').update({ title: 'Changed' }));
    await assertFails(alice.doc('notifications/n1').set(notification('alice')));
  });

  it('are readable by their owner', async () => {
    const alice = userDb('alice');
    await assertSucceeds(alice.doc('notifications/n1').get());
    await assertSucceeds(alice.collection('notifications').where('uid', '==', 'alice').get());
  });

  it('are hidden from Bob, who cannot delete them', async () => {
    const bob = userDb('bob');
    await assertFails(bob.doc('notifications/n1').get());
    await assertFails(bob.collection('notifications').where('uid', '==', 'alice').get());
    await assertFails(bob.doc('notifications/n1').delete());
  });

  it('are deletable by their owner', async () => {
    await assertSucceeds(userDb('alice').doc('notifications/n1').delete());
  });
});

describe('devices', () => {
  it('lets Alice write, read and delete her own device', async () => {
    const alice = userDb('alice');
    await assertSucceeds(alice.doc('users/alice/devices/tok').set(device('alice', 'tok')));
    await assertSucceeds(alice.doc('users/alice/devices/tok').set(device('alice', 'tok')));
    await assertSucceeds(alice.doc('users/alice/devices/tok').get());
    await assertSucceeds(alice.doc('users/alice/devices/tok').delete());
  });

  it("denies Alice writing under Bob's path", async () => {
    const alice = userDb('alice');
    await assertFails(alice.doc('users/bob/devices/tok').set(device('alice', 'tok')));
    await assertFails(alice.doc('users/bob/devices/tok').set(device('bob', 'tok')));
  });

  it('denies a device whose uid or token does not match its path', async () => {
    const alice = userDb('alice');
    await assertFails(alice.doc('users/alice/devices/tok').set(device('bob', 'tok')));
    await assertFails(alice.doc('users/alice/devices/tok').set(device('alice', 'other')));
  });

  it('denies a device with a bad or oversized field, or an unknown one', async () => {
    const alice = userDb('alice');
    await assertFails(
      alice.doc('users/alice/devices/a').set(device('alice', 'a', { userAgent: 'x'.repeat(1025) })),
    );
    await assertFails(
      alice.doc('users/alice/devices/b').set(device('alice', 'b', { updatedAt: 1 })),
    );
    await assertFails(
      alice.doc('users/alice/devices/c').set(device('alice', 'c', { isAdmin: true })),
    );
  });

  describe("on Alice's path", () => {
    beforeEach(async () => {
      await seed((db) => db.doc('users/alice/devices/tok').set(device('alice', 'tok')));
    });

    it('are hidden from Bob, who cannot change or delete them', async () => {
      const bob = userDb('bob');
      await assertFails(bob.doc('users/alice/devices/tok').get());
      await assertFails(bob.collection('users/alice/devices').get());
      await assertFails(bob.doc('users/alice/devices/tok').set(device('alice', 'tok')));
      await assertFails(bob.doc('users/alice/devices/tok').delete());
    });

    it('cannot be moved to another uid by Alice', async () => {
      await assertFails(userDb('alice').doc('users/alice/devices/tok').update({ uid: 'bob' }));
    });
  });

  it('leaves the user document itself closed', async () => {
    await assertFails(userDb('alice').doc('users/alice').get());
    await assertFails(userDb('alice').doc('users/alice').set({ uid: 'alice' }));
  });
});
