/**
 * Task descriptions as safe HTML (S3): markdown-it with raw HTML off, so typed tags stay text,
 * then DOMPurify over the result, so nothing markdown-it emits can carry script. Every link opens
 * in a new tab with `rel="noopener noreferrer"`.
 */
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true });

/** This module's own DOMPurify, so its link hook never changes sanitising elsewhere. */
const purifier = DOMPurify(window);
purifier.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function renderMarkdown(src: string): string {
  return purifier.sanitize(markdown.render(src), { USE_PROFILES: { html: true } });
}
