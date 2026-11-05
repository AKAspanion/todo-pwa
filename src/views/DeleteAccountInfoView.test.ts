import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import DeleteAccountInfoView from './DeleteAccountInfoView.vue';

const Blank = { render: () => h('div') };

const MAILTO = 'mailto:panditankit1995@gmail.com?subject=Delete%20my%20Task%20Manager%20account';

/** Mounts /delete-account under a router holding the pages it links to and the back button's fallback. */
async function mountDeleteInfo() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: Blank },
      { path: '/profile', component: Blank },
      { path: '/delete-account', component: DeleteAccountInfoView },
    ],
  });
  await router.push('/delete-account');
  await router.isReady();
  const wrapper = mount(DeleteAccountInfoView, { global: { plugins: [vuetify, i18n, router] } });
  return { wrapper, router };
}

describe('DeleteAccountInfoView (W4)', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en';
    window.history.replaceState(null, '');
  });

  it('is titled "Delete your Task Manager account", for Task Manager by Ankit Kumar Pandit', async () => {
    const { wrapper } = await mountDeleteInfo();

    expect(wrapper.get('h1').text()).toBe('Delete your Task Manager account');
    expect(wrapper.text()).toContain('Task Manager by Ankit Kumar Pandit');
  });

  it('gives the in-app steps, ending in typing DELETE, and a "Go to Profile" link', async () => {
    const { wrapper } = await mountDeleteInfo();

    const steps = wrapper.findAll('ol li').map((step) => step.text());
    expect(steps).toEqual([
      'Sign in.',
      'Open Profile.',
      'Choose Delete account.',
      "Confirm it's you.",
      'Type DELETE.',
    ]);
    const profile = wrapper.get('a[href="/profile"]');
    expect(profile.text()).toBe('Go to Profile');
  });

  it('opens the profile from "Go to Profile"', async () => {
    const { wrapper, router } = await mountDeleteInfo();

    await wrapper.get('a[href="/profile"]').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/profile');
  });

  it('gives the email way, with its subject, answered within 30 days', async () => {
    const { wrapper } = await mountDeleteInfo();

    expect(wrapper.find(`a[href="${MAILTO}"]`).exists()).toBe(true);
    expect(wrapper.text()).toContain('"Delete my Task Manager account"');
    expect(wrapper.text()).toContain('within 30 days');
  });

  it('says what is deleted and what is kept', async () => {
    const { wrapper } = await mountDeleteInfo();
    const text = wrapper.text();

    expect(text).toContain('Your account, and every task, label, reminder and push device of it.');
    expect(text).toContain(
      "Nothing, except Google Cloud's server logs holding your account ID, for up to 30 days.",
    );
  });

  it('marks its root as English', async () => {
    const { wrapper } = await mountDeleteInfo();

    expect(wrapper.attributes('lang')).toBe('en');
  });

  it('stays in English with Hindi as the app language', async () => {
    i18n.global.locale.value = 'hi';

    const { wrapper } = await mountDeleteInfo();

    expect(wrapper.get('h1').text()).toBe('Delete your Task Manager account');
    expect(wrapper.get('a[href="/profile"]').text()).toBe('Go to Profile');
  });

  it('goes back to /home when there is no previous page (W1)', async () => {
    const { wrapper, router } = await mountDeleteInfo();

    await wrapper.get('button[aria-label="Back"]').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/home');
  });
});
