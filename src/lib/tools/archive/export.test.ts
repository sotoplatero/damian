import { describe, it, expect } from 'vitest';
import type { ArchivePost } from '$lib/server/substack-archive';
import { DEEP_CREATED_AT, deepFixture } from '$lib/authors/fixtures';
import {
	bodyCandidates,
	buildExport,
	buildIndex,
	buildPostFile,
	buildReadme,
	exportFileName,
	minutesFor,
	minutesPhrase,
	monthsCovered,
	postFileName,
	summarize,
	type ExportInput
} from './export';

function post(over: Partial<ArchivePost> & { date: string }): ArchivePost {
	return {
		title: 'Un título cualquiera',
		subtitle: '',
		slug: `slug-${over.date.slice(0, 10)}`,
		audience: 'everyone',
		type: 'newsletter',
		words: 1000,
		reactions: 10,
		comments: 2,
		childComments: 1,
		restacks: 1,
		coverImage: '',
		sectionName: '',
		...over
	};
}

/** Newest first, which is the order the walk returns and the export assumes. */
const POSTS: ArchivePost[] = [
	post({ date: '2026-08-10T06:00:00.000Z', slug: 'el-mas-nuevo', title: 'El más nuevo' }),
	post({ date: '2026-08-03T06:00:00.000Z', slug: 'de-pago', audience: 'only_paid' }),
	post({ date: '2026-07-27T06:00:00.000Z', slug: 'ajeno', type: 'restack' }),
	post({ date: '2026-07-20T06:00:00.000Z', slug: 'el-mas-viejo' })
];

const PUB = {
	name: 'Objeto Brillante',
	authorName: 'Damian',
	origin: 'https://ejemplo.substack.com',
	createdAt: '2026-01-01T00:00:00.000Z'
};

function input(over: Partial<ExportInput> = {}): ExportInput {
	return {
		pub: PUB,
		posts: POSTS,
		bodies: new Map([['el-mas-nuevo', 'El cuerpo del más nuevo.']]),
		truncated: false,
		fromFeed: false,
		bodiesStoppedBy: 'complete',
		siteOrigin: 'https://ejemplo.com',
		generatedAt: new Date('2026-08-12T09:00:00.000Z'),
		...over
	};
}

describe('summarize', () => {
	it('counts free, paid and what is not a newsletter issue', () => {
		const summary = summarize(POSTS, PUB.createdAt);
		expect(summary.total).toBe(4);
		expect(summary.free).toBe(3);
		expect(summary.paid).toBe(1);
		expect(summary.other).toBe(1);
	});

	/**
	 * The trap this exists for: 435 of The Honest Broker's 1330 posts are dated
	 * `2000-01-01` from an imported archive. A range built over those says the
	 * newsletter started in the year 2000, which reads as a bug on the page and is
	 * a lie in the README.
	 */
	it('keeps imported dates out of the range and counts them', () => {
		const summary = summarize(deepFixture(), DEEP_CREATED_AT);
		expect(summary.importedDates).toBe(2);
		expect(summary.from.slice(0, 4)).toBe('2024');
		expect(summary.to.slice(0, 4)).toBe('2024');
	});

	it('falls back to the real dates when every one of them predates the pub', () => {
		const only = [post({ date: '2000-01-01T00:00:00.000Z' })];
		const summary = summarize(only, '2026-01-01T00:00:00.000Z');
		expect(summary.importedDates).toBe(1);
		expect(summary.from.slice(0, 4)).toBe('2000');
	});
});

describe('bodyCandidates', () => {
	it('leaves out what the author did not write', () => {
		expect(bodyCandidates(POSTS).map((p) => p.slug)).toEqual([
			'el-mas-nuevo',
			'de-pago',
			'el-mas-viejo'
		]);
	});

	/**
	 * No cap, and the order is the walk's: newest first. The browser works down
	 * this list, so its order IS the order bodies arrive in — and the guard is
	 * against a cap creeping back in, which happened twice off throttled readings
	 * of Substack.
	 */
	it('takes every post, newest first, with no ceiling', () => {
		const many = Array.from({ length: 400 }, (_, i) =>
			post({ date: new Date(Date.UTC(2026, 0, 1) - i * 86400000).toISOString(), slug: `p-${i}` })
		);
		const chosen = bodyCandidates(many);
		expect(chosen).toHaveLength(400);
		expect(chosen[0].slug).toBe('p-0');
		expect(chosen.at(-1)?.slug).toBe('p-399');
	});

	it('skips a post with no slug, which cannot be fetched', () => {
		expect(bodyCandidates([post({ date: '2026-08-10T06:00:00.000Z', slug: '' })])).toHaveLength(0);
	});
});

describe('buildIndex', () => {
	it('carries every post, whether its body is in the zip or not', () => {
		const rows = buildIndex(input()).trim().split('\n');
		expect(rows).toHaveLength(POSTS.length + 1);
		expect(rows[0]).toContain('fecha,titulo');
		// Only the one with a body names a file.
		expect(rows[1].endsWith(',2026-08-10-el-mas-nuevo.md')).toBe(true);
		expect(rows[2].endsWith(',')).toBe(true);
	});

	it('quotes a title with a comma and doubles its quotes', () => {
		const csv = buildIndex(
			input({
				posts: [post({ date: '2026-08-10T06:00:00.000Z', title: 'Uno, dos y "tres"' })],
				bodies: new Map()
			})
		);
		expect(csv).toContain('"Uno, dos y ""tres"""');
	});

	it('opens with the BOM, or Excel shows the accents wrong', () => {
		expect(buildIndex(input()).startsWith('﻿')).toBe(true);
	});

	it('says gratis or pago, not everyone or only_paid', () => {
		const csv = buildIndex(input());
		expect(csv).toContain(',gratis,');
		expect(csv).toContain(',pago,');
	});
});

describe('buildPostFile', () => {
	it('puts the data above the post', () => {
		const file = buildPostFile(POSTS[0], 'El cuerpo.', PUB.origin);
		expect(file).toContain('titulo: "El más nuevo"');
		expect(file).toContain('url: https://ejemplo.substack.com/p/el-mas-nuevo');
		expect(file).toContain('audiencia: gratis');
		expect(file).toContain('# El más nuevo');
		expect(file.trimEnd().endsWith('El cuerpo.')).toBe(true);
	});

	/** A paywalled body is whatever Substack shows without a subscription. */
	it('warns that a paid post may be cut off', () => {
		expect(buildPostFile(POSTS[1], 'Medio cuerpo.', PUB.origin)).toContain('cortado');
		expect(buildPostFile(POSTS[0], 'Cuerpo.', PUB.origin)).not.toContain('cortado');
	});
});

describe('buildReadme', () => {
	it('prints the number of bodies it really has, not the number asked for', () => {
		const data = input();
		const readme = buildReadme(data, summarize(data.posts, PUB.createdAt));
		expect(readme).toContain('4 entradas');
		expect(readme).toContain('1 post entero');
	});

	it('says nothing about what is missing when nothing is', () => {
		const data = input({
			posts: [POSTS[0]],
			bodies: new Map([['el-mas-nuevo', 'x']]),
			bodiesStoppedBy: 'complete'
		});
		const readme = buildReadme(data, summarize(data.posts, PUB.createdAt));
		expect(readme).not.toContain('Lo que falta');
	});

	/**
	 * A file that stopped early has to say so with both numbers in it — what it has
	 * and what the publication has — because the reader's next question is always
	 * "is this everything?" and the answer has to be in the file, not in the tab
	 * that produced it.
	 */
	it('says how many are missing when the download was stopped', () => {
		const data = input({ bodiesStoppedBy: 'stopped' });
		const readme = buildReadme(data, summarize(data.posts, PUB.createdAt));
		expect(readme).toContain('Lo que falta');
		// One body of the three posts that are newsletter issues.
		expect(readme).toContain('**1** cuerpos de los 3');
		expect(readme).toContain('El índice sí está completo');
	});

	/**
	 * The cap is a decision, not a wall, and the file has to say so — two caps were
	 * already set off misread rate limits and written up as technical necessity.
	 * It also carries the months covered: the information a date-window rule would
	 * have given, without its variance.
	 */
	it('explains the cap as a choice, with the months it covers', () => {
		const data = input({ bodiesStoppedBy: 'cap' });
		const readme = buildReadme(data, summarize(data.posts, PUB.createdAt));
		expect(readme).toContain('**1 más recientes**');
		expect(readme).toContain('de agosto de 2026');
		expect(readme).toContain('No es un límite técnico');
		expect(readme).toContain('último año');
	});

	it('warns about the feed and about a truncated walk', () => {
		const data = input({ fromFeed: true, truncated: true });
		const readme = buildReadme(data, summarize(data.posts, PUB.createdAt));
		expect(readme).toContain('RSS');
		expect(readme).toContain('más antiguos');
	});

	it('names the author and links back to the tool', () => {
		const data = input();
		const readme = buildReadme(data, summarize(data.posts, PUB.createdAt));
		expect(readme).toContain('Damian');
		expect(readme).toContain('https://ejemplo.com/tool/archive');
	});
});

describe('monthsCovered and minutesFor', () => {
	it('reads the months off the posts that actually have a body', () => {
		expect(monthsCovered(POSTS, new Map([['el-mas-viejo', 'x']]))).toBe('de julio de 2026');
		expect(
			monthsCovered(
				POSTS,
				new Map([
					['el-mas-nuevo', 'x'],
					['el-mas-viejo', 'x']
				])
			)
		).toBe('de julio de 2026 a agosto de 2026');
	});

	it('says nothing when there is nothing to say', () => {
		expect(monthsCovered(POSTS, new Map())).toBe('');
	});

	/** 2.9 pages a second plus a 40 s pause every hundred, from the measurements. */
	it('never promises less than a minute', () => {
		expect(minutesFor(10)).toBe(1);
		expect(minutesFor(150)).toBe(2);
		expect(minutesFor(1150)).toBe(14);
	});

	/** «unos 1 min» is what a template gives you, and it shipped once. */
	it('says the number in words that read like Spanish', () => {
		expect(minutesPhrase(10)).toBe('un minuto');
		expect(minutesPhrase(1150)).toBe('unos 14 minutos');
	});
});

describe('buildExport', () => {
	it('lays out one readme, one index and one file per body', () => {
		const { entries } = buildExport(input());
		expect(entries.map((entry) => entry.name)).toEqual([
			'LEEME.md',
			'indice.csv',
			'posts/2026-08-10-el-mas-nuevo.md'
		]);
	});

	it('names a file after the date and the slug', () => {
		expect(postFileName(POSTS[0])).toBe('posts/2026-08-10-el-mas-nuevo.md');
	});

	it('survives a post with an unusable date', () => {
		expect(postFileName(post({ date: 'no es una fecha', slug: 'raro' }))).toBe('posts/raro.md');
	});

	it('names the zip after the publication and the day', () => {
		expect(exportFileName('ejemplo.substack.com', new Date('2026-08-12T09:00:00.000Z'))).toBe(
			'archivo-ejemplo-substack-com-2026-08-12.zip'
		);
	});

	/**
	 * The README's count is what the zip has, not what the map was handed: the
	 * byte budget drops bodies, and a README that says 150 while `posts/` holds 90
	 * is exactly the kind of quiet lie this whole file is written against.
	 */
	it('keeps the readme and the files agreeing after the byte budget bites', () => {
		const huge = 'x'.repeat(7_000_000);
		const data = input({
			posts: POSTS,
			bodies: new Map([
				['el-mas-nuevo', huge],
				['de-pago', huge],
				['el-mas-viejo', huge]
			])
		});
		const { entries } = buildExport(data);
		const files = entries.filter((entry) => entry.name.startsWith('posts/'));
		expect(files).toHaveLength(1);
		expect(entries[0].content).toContain('1 post entero');
		// The newest is the one kept.
		expect(files[0].name).toContain('el-mas-nuevo');
	});
});
