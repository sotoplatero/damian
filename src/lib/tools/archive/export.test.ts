import { describe, it, expect } from 'vitest';
import type { ArchivePost } from '$lib/server/substack-archive';
import { DEEP_CREATED_AT, deepFixture } from '$lib/authors/fixtures';
import {
	archiveFileName,
	bodyCandidates,
	buildArchive,
	buildExport,
	buildHead,
	buildIndexSection,
	buildPostSection,
	demoteHeadings,
	exportFileName,
	minutesFor,
	minutesPhrase,
	monthsCovered,
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
		slug: 'ejemplo.substack.com',
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
	 * a lie in the file.
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

describe('buildIndexSection', () => {
	it('carries every post, whether its body is in the file or not', () => {
		const lines = buildIndexSection(input()).trim().split('\n');
		// The heading, its blank line, and one line per post.
		expect(lines).toHaveLength(POSTS.length + 2);
		expect(lines[0]).toBe('## Índice');
		expect(lines[2]).toContain('[El más nuevo](https://ejemplo.substack.com/p/el-mas-nuevo)');
	});

	/**
	 * The index is the only place that says which entries have their post below and
	 * which don't: a restack, a podcast, or anything past where the download stopped
	 * is here with its date and its link and nothing else.
	 */
	it('marks the entries with no body, and names what they are', () => {
		const lines = buildIndexSection(input()).trim().split('\n');
		expect(lines[2]).not.toContain('solo en el índice');
		expect(lines[3]).toContain('solo en el índice');
		expect(lines.find((line) => line.includes('/p/ajeno'))).toContain('restack');
	});

	it('says gratis or pago, not everyone or only_paid', () => {
		const section = buildIndexSection(input());
		expect(section).toContain('· gratis ·');
		expect(section).toContain('· pago ·');
	});

	/** A bracket in a title closes the link early and swallows the URL. */
	it('escapes the brackets of a title', () => {
		const section = buildIndexSection(
			input({
				posts: [post({ date: '2026-08-10T06:00:00.000Z', title: 'Uno [dos] tres' })],
				bodies: new Map()
			})
		);
		expect(section).toContain('[Uno \\[dos\\] tres]');
	});

	/**
	 * From the RSS fallback every figure is zero, because the feed does not carry
	 * them. Printing them says "nobody reads this" instead of "we could not see".
	 */
	it('leaves out a figure that is zero', () => {
		const section = buildIndexSection(
			input({
				posts: [
					post({
						date: '2026-08-10T06:00:00.000Z',
						words: 0,
						reactions: 0,
						comments: 0,
						restacks: 0
					})
				],
				bodies: new Map()
			})
		);
		expect(section).not.toContain('0 likes');
		expect(section).not.toContain('0 palabras');
	});
});

describe('demoteHeadings', () => {
	it('pushes a body heading under the post it belongs to', () => {
		expect(demoteHeadings('# Uno\n\ntexto\n\n### Tres', 2)).toBe('### Uno\n\ntexto\n\n##### Tres');
	});

	it('never goes past six', () => {
		expect(demoteHeadings('##### Cinco\n###### Seis', 2)).toBe('###### Cinco\n###### Seis');
	});

	/** `html.ts` writes fenced blocks, and a shell comment inside one is not a heading. */
	it('leaves alone what is inside fenced code', () => {
		const fence = '```';
		const body = `${fence}\n# no soy un título\n${fence}\n\n# sí lo soy`;
		expect(demoteHeadings(body, 2)).toBe(`${fence}\n# no soy un título\n${fence}\n\n### sí lo soy`);
	});

	it('does not touch a hash that is not a heading', () => {
		expect(demoteHeadings('el #1 del año\n#sinespacio', 2)).toBe('el #1 del año\n#sinespacio');
	});
});

describe('buildPostSection', () => {
	it('opens with a rule and puts the data over the post', () => {
		const section = buildPostSection(POSTS[0], 'El cuerpo.', PUB.origin);
		expect(section.startsWith('---\n')).toBe(true);
		expect(section).toContain('## El más nuevo');
		expect(section).toContain('10 de agosto de 2026 · gratis');
		expect(section).toContain('[en Substack](https://ejemplo.substack.com/p/el-mas-nuevo)');
		expect(section.trimEnd().endsWith('El cuerpo.')).toBe(true);
	});

	/** A paywalled body is whatever Substack shows without a subscription. */
	it('warns that a paid post may be cut off', () => {
		expect(buildPostSection(POSTS[1], 'Medio cuerpo.', PUB.origin)).toContain('cortado');
		expect(buildPostSection(POSTS[0], 'Cuerpo.', PUB.origin)).not.toContain('cortado');
	});
});

describe('buildHead', () => {
	it('prints the number of bodies it really has, not the number asked for', () => {
		const data = input();
		const head = buildHead(data, summarize(data.posts, PUB.createdAt));
		expect(head).toContain('**4 entradas**');
		expect(head).toContain('**1 post entero**');
	});

	it('says nothing about what is missing when nothing is', () => {
		const data = input({
			posts: [POSTS[0]],
			bodies: new Map([['el-mas-nuevo', 'x']]),
			bodiesStoppedBy: 'complete'
		});
		expect(buildHead(data, summarize(data.posts, PUB.createdAt))).not.toContain('Lo que falta');
	});

	/**
	 * A file that stopped early has to say so with both numbers in it — what it has
	 * and what the publication has — because the reader's next question is always
	 * "is this everything?" and the answer has to be in the file, not in the tab
	 * that produced it.
	 */
	it('says how many are missing when the download was stopped', () => {
		const data = input({ bodiesStoppedBy: 'stopped' });
		const head = buildHead(data, summarize(data.posts, PUB.createdAt));
		expect(head).toContain('Lo que falta');
		// One body of the three posts that are newsletter issues.
		expect(head).toContain('**1** cuerpos de los 3');
		expect(head).toContain('El índice sí está completo');
	});

	/**
	 * The cap is a decision, not a wall, and the file has to say so — two caps were
	 * already set off misread rate limits and written up as technical necessity.
	 * It also carries the months covered: the information a date-window rule would
	 * have given, without its variance.
	 */
	it('explains the cap as a choice, with the months it covers', () => {
		const data = input({ bodiesStoppedBy: 'cap' });
		const head = buildHead(data, summarize(data.posts, PUB.createdAt));
		expect(head).toContain('**1 más recientes**');
		expect(head).toContain('de agosto de 2026');
		expect(head).toContain('No es un límite técnico');
		expect(head).toContain('último año');
	});

	it('warns about the feed and about a truncated walk', () => {
		const data = input({ fromFeed: true, truncated: true });
		const head = buildHead(data, summarize(data.posts, PUB.createdAt));
		expect(head).toContain('RSS');
		expect(head).toContain('más antiguos');
	});

	/**
	 * NOT a footnote and not droppable: whoever holds this file is holding somebody
	 * else's writing, which is what the tool is for.
	 */
	it('names the author and says the writing is theirs', () => {
		const data = input();
		expect(buildHead(data, summarize(data.posts, PUB.createdAt))).toContain(
			'Lo escribió Damian y sigue siendo suyo'
		);
	});
});

describe('buildArchive', () => {
	it('lays out the head, then the index, then every body it has', () => {
		const data = input({
			bodies: new Map([
				['el-mas-viejo', 'Cuerpo viejo.'],
				['el-mas-nuevo', 'Cuerpo nuevo.']
			])
		});
		const file = buildArchive(data, summarize(data.posts, PUB.createdAt));

		expect(file.indexOf('# El archivo de Objeto Brillante')).toBeLessThan(
			file.indexOf('## Índice')
		);
		expect(file.indexOf('## Índice')).toBeLessThan(file.indexOf('Cuerpo nuevo.'));
		// The walk's order, newest first, which is the index's order too.
		expect(file.indexOf('Cuerpo nuevo.')).toBeLessThan(file.indexOf('Cuerpo viejo.'));
		expect(file).toContain('https://ejemplo.com/tool/archive');
	});

	it('leaves out the posts whose body never arrived', () => {
		const file = buildArchive(input(), summarize(POSTS, PUB.createdAt));
		expect(file).toContain('## El más nuevo');
		// The rest are in the index and have no section of their own.
		expect(file).not.toContain('## Un título cualquiera');
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
	/** One file. It was a README, a CSV and a folder of posts until 14 August 2026. */
	it('lays out a single markdown file, named after the zip around it', () => {
		const { entries } = buildExport(input());
		expect(entries.map((entry) => entry.name)).toEqual([
			'archivo-ejemplo-substack-com-2026-08-12.md'
		]);
	});

	it('names the zip and the file inside it the same, bar the extension', () => {
		const at = new Date('2026-08-12T09:00:00.000Z');
		expect(exportFileName('ejemplo.substack.com', at)).toBe(
			'archivo-ejemplo-substack-com-2026-08-12.zip'
		);
		expect(archiveFileName('ejemplo.substack.com', at)).toBe(
			'archivo-ejemplo-substack-com-2026-08-12.md'
		);
	});

	/**
	 * The head's count is what the file has, not what the map was handed: the byte
	 * budget drops bodies, and a head that says 150 while the file holds 90 is
	 * exactly the kind of quiet lie this whole module is written against.
	 */
	it('keeps the count and the bodies agreeing after the byte budget bites', () => {
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
		expect(entries[0].content).toContain('**1 post entero**');
		// The newest is the one kept.
		expect(entries[0].content).toContain('## El más nuevo');
		expect(entries[0].content).not.toContain('## Un título cualquiera');
	});
});
