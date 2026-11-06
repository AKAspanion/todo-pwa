/** The app's data, as the client sees it. Firestore documents map to these in src/services (Task 2). */

export type TaskStatus = 'todo' | 'done';

/** A label, stored in the `types` collection (its name since the first version of the app). */
export interface Label {
  id: string;
  uid: string;
  label: string;
  color: string;
}

export interface Task {
  id: string;
  uid: string;
  title: string;
  description: string;
  status: TaskStatus;
  indefinite: boolean;
  /** 'YYYY-MM-DD' in the device's local time zone, or null for an indefinite task. */
  date: string | null;
  /** 'HH:mm' in the device's local time zone, or null for an indefinite task. */
  time: string | null;
  /** The IANA time zone the date and time were entered in, such as 'Asia/Kolkata'. */
  timeZone: string;
  /** The task's due instant (UTC), or null; the reminder is sent within the hour before it. */
  remindAt: Date | null;
  reminded: boolean;
  labelIds: string[];
}

/** What a user enters when adding or editing a task. */
export type TaskInput = Pick<
  Task,
  'title' | 'description' | 'indefinite' | 'date' | 'time' | 'labelIds'
>;

export interface AppNotification {
  id: string;
  uid: string;
  title: string;
  body: string;
  taskId: string | null;
  createdAt: Date;
}

export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  /** False for an email account whose address isn't verified yet; the reminder banner shows then. */
  emailVerified: boolean;
}
