/**
 * Reminder notifications in the `notifications` collection. The reminder function writes them;
 * the client only reads and deletes its own (S2).
 */
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notificationFromDoc } from './legacy';
import type { AppNotification } from '@/types/models';

const NOTIFICATIONS = 'notifications';

/**
 * The user's notifications, newest first (D5). Sorted here rather than by the query, so old
 * documents without `createdAt` (which an `orderBy` would leave out) are listed too.
 */
export async function listNotifications(uid: string): Promise<AppNotification[]> {
  const snapshot = await getDocs(query(collection(db, NOTIFICATIONS), where('uid', '==', uid)));
  return snapshot.docs
    .map((d) => notificationFromDoc(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function deleteNotification(id: string): Promise<void> {
  return deleteDoc(doc(db, NOTIFICATIONS, id));
}
