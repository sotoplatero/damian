import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from './html';

/**
 * The fixtures are hand-written in the SHAPE Substack emits — a captioned image
 * inside two divs, a subscribe widget inside three, `pencraft` classes around
 * ordinary paragraphs — and not copies of anybody's post. What is being tested is
 * the structure, and the structure is all that has to be real.
 */

describe('htmlToMarkdown', () => {
	it('keeps the structure of a body', () => {
		const md = htmlToMarkdown(
			'<h2>El titular</h2><p>Un párrafo con <strong>algo en negrita</strong> y un <a href="https://ejemplo.com/x">enlace</a>.</p><p>Otro párrafo.</p>'
		);
		expect(md).toBe(
			'## El titular\n\nUn párrafo con **algo en negrita** y un [enlace](https://ejemplo.com/x).\n\nOtro párrafo.'
		);
	});

	/**
	 * MEASURED on three real bodies: the only named entities Substack emits are
	 * `&quot;` (360 of them) and `&amp;` (47). Accents come through as literal
	 * UTF-8, which is why `decode` never needed a table of named entities and this
	 * test doesn't ask for one.
	 */
	it('decodes the two entities that actually turn up', () => {
		expect(htmlToMarkdown('<p>Dijo &quot;esto&quot; y Tal &amp; Cual.</p>')).toBe(
			'Dijo "esto" y Tal & Cual.'
		);
	});

	it('leaves no html behind', () => {
		const md = htmlToMarkdown(
			'<div class="pencraft"><p>Uno</p><ul><li>a</li><li>b</li></ul><hr><blockquote><p>Citado</p></blockquote></div>'
		);
		expect(md).not.toMatch(/<[a-z/]/i);
	});

	/** Tight, not one blank line per item: a loose list reads as short paragraphs. */
	it('numbers an ordered list and bullets an unordered one', () => {
		expect(htmlToMarkdown('<ol><li>uno</li><li>dos</li><li>tres</li></ol>')).toBe(
			'1. uno\n2. dos\n3. tres'
		);
		expect(htmlToMarkdown('<ul><li>uno</li><li>dos</li></ul>')).toBe('- uno\n- dos');
	});

	/** The trap: matching the outer list first merged `a` and `b` into `ab`. */
	it('keeps every item of a nested list, indented', () => {
		expect(
			htmlToMarkdown('<ul><li>fuera<ul><li>dentro</li><li>y otra</li></ul></li><li>otra fuera</li></ul>')
		).toBe('- fuera\n  - dentro\n  - y otra\n- otra fuera');
	});

	it('prefixes every line of a quote', () => {
		expect(htmlToMarkdown('<blockquote><p>Primera</p><p>Segunda</p></blockquote>')).toBe(
			'> Primera\n> Segunda'
		);
	});

	it('keeps the image and its caption', () => {
		const md = htmlToMarkdown(
			'<div class="captioned-image-container"><figure><a class="image-link" href="https://sub.com/i/1"><img src="https://sub.com/foto.jpg" alt=""></a><figcaption class="image-caption">El pie</figcaption></figure></div>'
		);
		expect(md).toContain('![](https://sub.com/foto.jpg)');
		expect(md).toContain('_El pie_');
	});

	/**
	 * The one that justifies `removeContainers`. The subscribe box is divs inside
	 * divs, so cutting at the first `</div>` leaves the tail of it in the post —
	 * and it repeats in every single post of the archive.
	 */
	it('throws away the subscribe widget, nested divs and all', () => {
		const md = htmlToMarkdown(
			'<p>Antes.</p><div class="subscription-widget-wrap" data-attrs="{}"><div class="subscription-widget show-subscribe"><div class="preamble"><p class="cta-caption">Suscríbete para no perderte nada</p></div><form class="subscription-widget-subscribe"><button class="button primary"><span>Suscribirse</span></button></form></div></div><p>Después.</p>'
		);
		expect(md).toBe('Antes.\n\nDespués.');
	});

	it('throws away the paywall panel but keeps what came before it', () => {
		const md = htmlToMarkdown(
			'<p>La parte gratis.</p><div class="paywall"><div class="paywall-content"><h3>Este post es para suscriptores de pago</h3><div class="paywall-buttons"><a href="/subscribe">Suscribirse ya</a></div></div></div>'
		);
		expect(md).toBe('La parte gratis.');
	});

	/**
	 * `pencraft` is the class newer posts wrap ordinary paragraphs in. It looks
	 * exactly like widget furniture and blacklisting it empties the body, so this
	 * test is the guard on that mistake.
	 */
	it('keeps a pencraft div, which is not furniture', () => {
		expect(htmlToMarkdown('<div class="pencraft pc-display-contents"><p>Contenido</p></div>')).toBe(
			'Contenido'
		);
	});

	it('leaves a bare url as a url instead of [url](url)', () => {
		expect(htmlToMarkdown('<p><a href="https://ejemplo.com">https://ejemplo.com</a></p>')).toBe(
			'https://ejemplo.com'
		);
	});

	it('drops an empty heading, which is a spacer and not a section', () => {
		expect(htmlToMarkdown('<p>Uno</p><h3></h3><p>Dos</p>')).toBe('Uno\n\nDos');
	});

	it('survives html that never closes its div', () => {
		expect(htmlToMarkdown('<p>Bien.</p><div class="subscription-widget-wrap"><p>Mal.')).toBe(
			'Bien.'
		);
	});
});
