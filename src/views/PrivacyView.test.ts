import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import PrivacyView from './PrivacyView.vue';

const Blank = { render: () => h('div') };

/** Mounts /privacy under a router holding the pages it links to and the back button's fallback. */
async function mountPrivacy() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: Blank },
      { path: '/privacy', component: PrivacyView },
      { path: '/delete-account', component: Blank },
    ],
  });
  await router.push('/privacy');
  await router.isReady();
  const wrapper = mount(PrivacyView, { global: { plugins: [vuetify, i18n, router] } });
  return { wrapper, router };
}

const HEADINGS = [
  'Who',
  'What we collect and why',
  'Who processes it',
  'Ads',
  "What we don't do",
  'Security',
  'Keeping and deleting your data',
  'Children',
  'Changes',
];

describe('PrivacyView (W3)', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en';
    window.history.replaceState(null, '');
  });

  it('is headed "Privacy policy" with its effective date', async () => {
    const { wrapper } = await mountPrivacy();

    expect(wrapper.get('h1').text()).toBe('Privacy policy');
    expect(wrapper.text()).toContain('Effective 6 November 2026');
  });

  it('names the developer and links to his email', async () => {
    const { wrapper } = await mountPrivacy();

    expect(wrapper.text()).toContain('Ankit Kumar Pandit');
    expect(wrapper.find('a[href="mailto:panditankit1995@gmail.com"]').exists()).toBe(true);
  });

  it("has each of W3's sections, in order", async () => {
    const { wrapper } = await mountPrivacy();

    expect(wrapper.findAll('h2').map((heading) => heading.text())).toEqual(HEADINGS);
  });

  it('says how long logs are kept, the age limit, and links to /delete-account', async () => {
    const { wrapper } = await mountPrivacy();

    expect(wrapper.text()).toContain('under 13');
    expect(wrapper.text()).toContain('30 days');
    expect(wrapper.find('a[href="/delete-account"]').exists()).toBe(true);
  });

  it('names each Firebase service, and says there is no analytics', async () => {
    const { wrapper } = await mountPrivacy();
    const text = wrapper.text();

    for (const service of [
      'Firebase Authentication',
      'Cloud Firestore',
      'Hosting',
      'Cloud Functions',
      'Cloud Messaging',
    ]) {
      expect(text).toContain(service);
    }
    expect(text).not.toContain('No ads');
    expect(text).toContain('No analytics');
  });

  it('says the app shows Google AdSense ads, how consent works, and how to opt out', async () => {
    const { wrapper } = await mountPrivacy();
    const text = wrapper.text();

    expect(text).toContain('Google AdSense');
    expect(text).toContain('cookies');
    expect(text).toContain('the EEA, the UK or Switzerland');
    expect(wrapper.find('a[href="https://adssettings.google.com"]').exists()).toBe(true);
    expect(
      wrapper.find('a[href="https://policies.google.com/technologies/partner-sites"]').exists(),
    ).toBe(true);
  });

  it('marks its root as English', async () => {
    const { wrapper } = await mountPrivacy();

    expect(wrapper.attributes('lang')).toBe('en');
  });

  it('stays in English with Hindi as the app language', async () => {
    i18n.global.locale.value = 'hi';

    const { wrapper } = await mountPrivacy();

    expect(wrapper.get('h1').text()).toBe('Privacy policy');
    expect(wrapper.findAll('h2').map((heading) => heading.text())).toEqual(HEADINGS);
  });

  it('goes back to /home when there is no previous page (W1)', async () => {
    const { wrapper, router } = await mountPrivacy();

    await wrapper.get('button[aria-label="Back"]').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/home');
  });

  it('goes back to the previous page when there is one (W1)', async () => {
    const { wrapper, router } = await mountPrivacy();
    window.history.replaceState({ back: '/signin' }, '');
    const back = vi.spyOn(router, 'back').mockImplementation(() => {});
    const push = vi.spyOn(router, 'push');

    await wrapper.get('button[aria-label="Back"]').trigger('click');

    expect(back).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });
});
