import { describe, expect, it } from 'vitest';
import { renderStandalone } from './emails';
import sevenFrameworks from '../emails/tool-7-frameworks.md?raw';
import tenPostTypes from '../emails/tool-10-post-types.md?raw';
import newsletter from '../emails/tool-newsletter.md?raw';
import repurpose from '../emails/tool-repurpose.md?raw';
import substackAbout from '../emails/tool-substack-about.md?raw';

const UNSUBSCRIBE = 'https://example.com/unsubscribe?e=x&t=y';

/**
 * Every tool template must render whole: a subject, a preheader (the inbox
 * preview line), its marker substituted and the unsubscribe link present.
 * A template that fails here would fail at send time, silently.
 */
const TEMPLATES = [
	{ name: 'tool-7-frameworks', raw: sevenFrameworks, marker: 'COPIES' },
	{ name: 'tool-10-post-types', raw: tenPostTypes, marker: 'POSTS' },
	{ name: 'tool-newsletter', raw: newsletter, marker: 'REPORT' },
	{ name: 'tool-repurpose', raw: repurpose, marker: 'PIECES' },
	{ name: 'tool-substack-about', raw: substackAbout, marker: 'REPORT' }
];

describe('renderStandalone', () => {
	for (const { name, raw, marker } of TEMPLATES) {
		it(`renders ${name} with subject, preheader and substituted marker`, () => {
			const content = 'GENERATED_CONTENT_SENTINEL';
			const { subject, html } = renderStandalone(raw, UNSUBSCRIBE, { [marker]: content });

			expect(subject).not.toBe('');
			expect(html).toContain(content);
			expect(html).not.toContain(`{{${marker}}}`);
			// The preheader div is painted invisible at the top of the body.
			expect(html).toContain('display:none;max-height:0');
			expect(html).toContain(UNSUBSCRIBE);
			// Frontmatter comments (lines starting with #) must never reach the email.
			expect(html).not.toContain('preheader es la línea');
		});
	}

	it('keeps the subject out of reach of body substitution', () => {
		const raw = `---\nsubject: Asunto fijo\n---\n\nHola {{X}}\n`;
		const { subject, html } = renderStandalone(raw, UNSUBSCRIBE, { X: '---\nsubject: hacked\n---' });
		expect(subject).toBe('Asunto fijo');
		expect(html).toContain('hacked');
	});
});
