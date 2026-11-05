import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AppLogo from '@/components/layout/AppLogo.vue';

const POINTS = [
  '8,286 127.5,405.5 158,375 38.5,255.5',
  '218,254 248.5,284.5 384,149 353.5,118.5',
  '129,286 248,405 504.5,148.5 474,118 248,344 159.5,255.5',
];

describe('AppLogo', () => {
  it('renders one svg with the tick viewBox and a default width of 72', () => {
    const wrapper = mount(AppLogo);
    expect(wrapper.findAll('svg')).toHaveLength(1);
    const svg = wrapper.get('svg');
    expect(svg.attributes('viewBox')).toBe('0 104 512 308');
    expect(svg.attributes('width')).toBe('72');
  });

  it('takes its width from the size prop', () => {
    const wrapper = mount(AppLogo, { props: { size: 96 } });
    expect(wrapper.get('svg').attributes('width')).toBe('96');
  });

  it('is decorative: aria-hidden, no title, no aria-label', () => {
    const svg = mount(AppLogo).get('svg');
    expect(svg.attributes('aria-hidden')).toBe('true');
    expect(svg.find('title').exists()).toBe(false);
    expect(svg.attributes('aria-label')).toBeUndefined();
  });

  it('draws three polygons filled #2196F3 with the traced points', () => {
    const polygons = mount(AppLogo).findAll('polygon');
    expect(polygons.map((p) => p.attributes('points'))).toEqual(POINTS);
    for (const p of polygons) expect(p.attributes('fill')).toBe('#2196F3');
  });
});
