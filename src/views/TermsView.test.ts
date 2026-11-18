import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import { routes } from '@/router';
import TermsView from './TermsView.vue';

const Blank = { render: () => h('div') };

/** Mounts /terms under a router holding the pages it links to and the back button's fallback. */
async function mountTerms() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: Blank },
      { path: '/terms', component: TermsView },
      { path: '/privacy', component: Blank },
      { path: '/delete-account', component: Blank },
    ],
  });
  await router.push('/terms');
  await router.isReady();
  return mount(TermsView, { global: { plugins: [vuetify, i18n, router] } });
}

const HEADINGS = [
  'Agreeing to these terms',
  'Who',
  'The service',
  'Your account',
  'Your content',
  'Acceptable use',
  'Ads',
  'Reminders',
  'Ending',
  'Liability',
  'Governing law',
  'Changes',
];

describe('TermsView', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en';
  });

  it('is headed "Terms of service" with its effective date', async () => {
    const wrapper = await mountTerms();

    expect(wrapper.get('h1').text()).toBe('Terms of service');
    expect(wrapper.text()).toContain('Effective 18 November 2026');
  });

  it('has its twelve sections, in order', async () => {
    const wrapper = await mountTerms();

    expect(wrapper.findAll('h2').map((heading) => heading.text())).toEqual(HEADINGS);
  });

  it('names the developer and links to his email', async () => {
    const wrapper = await mountTerms();

    expect(wrapper.text()).toContain('Ankit Kumar Pandit');
    expect(wrapper.find('a[href="mailto:panditankit1995@gmail.com"]').exists()).toBe(true);
  });

  it('links to /privacy and /delete-account', async () => {
    const wrapper = await mountTerms();

    expect(wrapper.find('a[href="/privacy"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/delete-account"]').exists()).toBe(true);
  });

  it('is governed by the laws of India and sets a minimum age of 18', async () => {
    const wrapper = await mountTerms();

    expect(wrapper.text()).toContain('laws of India');
    expect(wrapper.text()).toContain('18 or older');
    expect(wrapper.text()).not.toContain('13');
  });

  it('says ads may be shown, not that they are shown today', async () => {
    const text = (await mountTerms()).text();

    expect(text).toContain('may show ads from Google AdSense');
    expect(text).not.toContain('shows ads');
  });

  it('mentions nothing the app does not do today', async () => {
    const text = (await mountTerms()).text();

    expect(text).not.toContain('Pro');
    expect(text).not.toContain('AI');
    for (const word of ['subscription', 'payment', 'price', 'export']) {
      expect(text.toLowerCase()).not.toContain(word);
    }
  });

  it('stays in English with Hindi as the app language', async () => {
    i18n.global.locale.value = 'hi';

    const wrapper = await mountTerms();

    expect(wrapper.get('h1').text()).toBe('Terms of service');
    expect(wrapper.attributes('lang')).toBe('en');
  });

  it('is a public route with no meta', () => {
    const route = routes.find((candidate) => candidate.path === '/terms');

    expect(route).toBeDefined();
    expect(route?.meta).toBeUndefined();
  });
});
