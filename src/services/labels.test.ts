import { addDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLabel } from './labels';

vi.mock('firebase/firestore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/firestore')>()),
  addDoc: vi.fn(),
}));

describe('createLabel (D15)', () => {
  beforeEach(() => {
    vi.mocked(addDoc).mockReset();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new' } as Awaited<ReturnType<typeof addDoc>>);
  });

  it.each([
    ['whitespace only', '   '],
    ['empty', ''],
    ['31 characters', 'a'.repeat(31)],
  ])('rejects a %s name with label/invalid-name, and stores nothing', async (_case, name) => {
    await expect(createLabel('alice', name, '#fff')).rejects.toThrow('label/invalid-name');
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('stores the trimmed name, up to 30 characters', async () => {
    const name = `  ${'b'.repeat(30)}  `;

    const label = await createLabel('alice', name, '#fff');

    expect(label).toEqual({ id: 'new', uid: 'alice', label: 'b'.repeat(30), color: '#fff' });
    expect(vi.mocked(addDoc).mock.calls[0]?.[1]).toEqual({
      uid: 'alice',
      label: 'b'.repeat(30),
      color: '#fff',
    });
  });

  it('rejects a colour longer than the rules allow', async () => {
    await expect(createLabel('alice', 'Work', '#'.repeat(33))).rejects.toThrow(
      'label/invalid-color',
    );
    expect(addDoc).not.toHaveBeenCalled();
  });
});
