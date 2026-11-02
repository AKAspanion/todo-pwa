import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

/** The rendered HTML as DOM, to check elements and attributes rather than text. */
function asDom(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

function eventHandlerAttributes(root: HTMLElement): string[] {
  return [...root.querySelectorAll('*')].flatMap((el) =>
    [...el.attributes].map((a) => a.name).filter((name) => name.startsWith('on')),
  );
}

describe('renderMarkdown (S3)', () => {
  it('renders raw HTML as text, never as an element or a handler', () => {
    const html = renderMarkdown('<img src=x onerror=alert(1)>**b**');

    expect(html).not.toContain('<img');
    expect(html).not.toMatch(/<[^>]*\sonerror\s*=/i);
    expect(eventHandlerAttributes(asDom(html))).toEqual([]);
    expect(asDom(html).querySelector('img')).toBeNull();
    expect(html).toContain('<strong>b</strong>');
  });

  it('never links a javascript: URL', () => {
    const html = renderMarkdown('[x](javascript:alert(1))');

    expect(html).not.toMatch(/href\s*=\s*["']?\s*javascript:/i);
    const hrefs = [...asDom(html).querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs.filter((href) => href?.trim().toLowerCase().startsWith('javascript:'))).toEqual(
      [],
    );
  });

  it('opens links in a new tab with rel="noopener noreferrer"', () => {
    const link = asDom(renderMarkdown('[site](https://example.com)')).querySelector('a');

    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link?.getAttribute('target')).toBe('_blank');
  });

  it('keeps ordinary Markdown', () => {
    const dom = asDom(renderMarkdown('# Title\n\n- one\n- two'));

    expect(dom.querySelector('h1')?.textContent).toBe('Title');
    expect(dom.querySelectorAll('li')).toHaveLength(2);
  });

  it('renders an empty description as nothing', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
