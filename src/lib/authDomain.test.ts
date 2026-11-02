import { describe, expect, it } from 'vitest';
import { pickAuthDomain } from './authDomain';

const APP_DOMAINS = 'todo.spanion.in,spanion-todo.web.app,spanion-todo.firebaseapp.com';
const FALLBACK = 'spanion-todo.firebaseapp.com';

describe('pickAuthDomain (review I5)', () => {
  it.each(['todo.spanion.in', 'spanion-todo.web.app', 'spanion-todo.firebaseapp.com'])(
    'uses the page host %s when it is one of the app domains, so the auth handler is same-origin',
    (host) => {
      expect(pickAuthDomain(host, APP_DOMAINS, FALLBACK)).toBe(host);
    },
  );

  it.each(['localhost:5173', 'evil.example', 'spanion-todo--preview-abc123.web.app', 'spanion.in'])(
    'uses the configured auth domain for any other host (%s)',
    (host) => {
      expect(pickAuthDomain(host, APP_DOMAINS, FALLBACK)).toBe(FALLBACK);
    },
  );

  it('ignores spaces, empty entries and letter case in the list', () => {
    const list = ' Todo.Spanion.in , ,spanion-todo.web.app,';
    expect(pickAuthDomain('todo.spanion.in', list, FALLBACK)).toBe('todo.spanion.in');
    expect(pickAuthDomain('TODO.SPANION.IN', list, FALLBACK)).toBe('todo.spanion.in');
    expect(pickAuthDomain('', list, FALLBACK)).toBe(FALLBACK);
  });

  it('matches whole host names only, never a suffix or a substring', () => {
    expect(pickAuthDomain('todo.spanion.in.evil.example', APP_DOMAINS, FALLBACK)).toBe(FALLBACK);
    expect(pickAuthDomain('xtodo.spanion.in', APP_DOMAINS, FALLBACK)).toBe(FALLBACK);
    expect(pickAuthDomain('web.app', APP_DOMAINS, FALLBACK)).toBe(FALLBACK);
  });

  it.each([undefined, ''])('uses the configured auth domain when the list is %j', (list) => {
    expect(pickAuthDomain('todo.spanion.in', list, FALLBACK)).toBe(FALLBACK);
  });
});
