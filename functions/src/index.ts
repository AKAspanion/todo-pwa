/**
 * The deployed Cloud Functions: only the scheduled reminder run. The old public HTTP
 * `testFunction`, which returned every user's FCM token and task titles (spec S1), is gone, and
 * nothing here answers HTTP requests.
 */
import { initializeApp } from 'firebase-admin/app';

// The default app, with the runtime's own credentials; `sendReminders` uses it when it runs.
initializeApp();

export { sendReminders } from './reminders';
