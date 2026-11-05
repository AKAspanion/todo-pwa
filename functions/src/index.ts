/**
 * The three deployed Cloud Functions: the scheduled reminder run, the budget kill-switch, and the
 * deletion of a user's documents when Auth deletes their account (spec D6). The old public HTTP
 * `testFunction`, which returned every user's FCM token and task titles (spec S1), is gone, and
 * nothing here answers HTTP requests (D7).
 */
import { initializeApp } from 'firebase-admin/app';

// The default app, with the runtime's own credentials; `sendReminders` and `deleteUserData` use it
// when they run.
initializeApp();

export { sendReminders } from './reminders';
export { stopBillingOnBudget } from './budget';
export { deleteUserData } from './deleteUserData';
