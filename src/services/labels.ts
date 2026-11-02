/** Labels in the `types` collection (the name the first version of the app gave them). */
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { labelFromDoc } from './legacy';
import type { Label } from '@/types/models';

const LABELS = 'types';
/** A label name is 1–30 characters after trimming (D15, and the security rules). */
export const LABEL_NAME_MAX = 30;
/** The security rules' limit on a stored colour. */
export const LABEL_COLOR_MAX = 32;

/** Characters as a person counts them (code points), not UTF-16 units. */
const length = (value: string): number => [...value].length;

export async function listLabels(uid: string): Promise<Label[]> {
  const snapshot = await getDocs(query(collection(db, LABELS), where('uid', '==', uid)));
  return snapshot.docs.map((d) => labelFromDoc(d.id, d.data()));
}

/**
 * Saves a label with its trimmed name. Rejects with Error('label/invalid-name') for a trimmed
 * name outside 1–30 characters, and Error('label/invalid-color') for a colour outside 1–32,
 * before anything is sent.
 */
export async function createLabel(uid: string, name: string, color: string): Promise<Label> {
  const label = typeof name === 'string' ? name.trim() : '';
  if (length(label) < 1 || length(label) > LABEL_NAME_MAX) throw new Error('label/invalid-name');
  const colour = typeof color === 'string' ? color.trim() : '';
  if (length(colour) < 1 || length(colour) > LABEL_COLOR_MAX) {
    throw new Error('label/invalid-color');
  }
  const ref = await addDoc(collection(db, LABELS), { uid, label, color: colour });
  return { id: ref.id, uid, label, color: colour };
}
