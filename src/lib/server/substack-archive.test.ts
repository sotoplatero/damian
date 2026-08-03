import { describe, it, expect, vi, afterEach } from 'vitest';
import { walkArchive, readFeed, MAX_PAGES } from './substack-archive';

// `get` is the only thing that touches the network; mocked here to test pagination.
vi.mock('./substack', async () => {
	const actual = await vi.importActual<typeof import('./substack')>('./substack');
	return { ...actual, get: vi.fn() };
});
const { get } = await import('./substack');

function jsonResponse(value: unknown): Response {
	return new Response(JSON.stringify(value), { status: 200 });
}

function fakePost(n: number) {
	return {
		title: `Post ${n}`,
		slug: `post-${n}`,
		post_date: new Date(Date.UTC(2026, 0, 1) + n * 86400000).toISOString(),
		audience: 'everyone',
		type: 'newsletter',
		wordcount: 1000,
		reaction_count: n,
		comment_count: 1,
		child_comment_count: 0
	};
}

afterEach(() => vi.mocked(get).mockReset());

describe('walkArchive', () => {
	it('advances by what it received, not by the requested limit', async () => {
		// Measured: offset=0 returns at most 23 even when 50 is requested. If the
		// walk advanced by 50 it would silently skip 27 posts on the first lap.
		vi.mocked(get)
			.mockResolvedValueOnce(jsonResponse(Array.from({ length: 23 }, (_, i) => fakePost(i))))
			.mockResolvedValueOnce(jsonResponse(Array.from({ length: 10 }, (_, i) => fakePost(23 + i))))
			.mockResolvedValueOnce(jsonResponse([]));

		const { posts, truncated } = await walkArchive('https://x.substack.com');

		expect(posts).toHaveLength(33);
		expect(truncated).toBe(false);
		// The second request must ask for offset=23, not offset=50.
		expect(vi.mocked(get).mock.calls[1][0].searchParams.get('offset')).toBe('23');
	});

	it('drops duplicates by slug', async () => {
		vi.mocked(get)
			.mockResolvedValueOnce(jsonResponse([fakePost(1), fakePost(2)]))
			.mockResolvedValueOnce(jsonResponse([fakePost(2), fakePost(3)]))
			.mockResolvedValueOnce(jsonResponse([]));

		const { posts } = await walkArchive('https://x.substack.com');
		expect(posts.map((p) => p.slug)).toEqual(['post-1', 'post-2', 'post-3']);
	});

	it('marks truncated once the page cap is hit and stops', async () => {
		// Every page returns the same post, so it never runs dry: it hits the cap instead.
		// A fresh Response per call: a `Response` body can only be read once, so
		// reusing one instance with `mockResolvedValue` would throw on the second read.
		vi.mocked(get).mockImplementation(() => Promise.resolve(jsonResponse([fakePost(1)])));
		// spacingMs 0: with the production 300 ms this would sleep almost 15 s.
		const { truncated } = await walkArchive('https://x.substack.com', 0);
		expect(truncated).toBe(true);
		expect(vi.mocked(get)).toHaveBeenCalledTimes(MAX_PAGES);
	});

	it('drops posts with no slug instead of silently merging them', async () => {
		// Two distinct posts that both lack a slug: deduping on slug alone would
		// treat both as the same '' key, and the second would vanish as a
		// "duplicate" with no error — the same silent-skip failure mode this
		// module exists to avoid for pagination (see the offset test above). A
		// slug-less post can't be linked to anyway, so both must be dropped
		// rather than one winning and standing in for the other.
		vi.mocked(get)
			.mockResolvedValueOnce(
				jsonResponse([
					{ ...fakePost(1), slug: '' },
					{ ...fakePost(2), slug: '' }
				])
			)
			.mockResolvedValueOnce(jsonResponse([]));

		const { posts } = await walkArchive('https://x.substack.com');
		expect(posts).toHaveLength(0);
	});
});

describe('readFeed', () => {
	it('pulls title and date from the RSS and zeroes what the RSS does not give', async () => {
		const xml = `<rss><channel><item>
			<title><![CDATA[Un libro en cada maleta]]></title>
			<description><![CDATA[Recomendaciones de verano]]></description>
			<link>https://x.substack.com/p/un-libro</link>
			<pubDate>Fri, 31 Jul 2026 05:02:09 GMT</pubDate>
		</item></channel></rss>`;
		vi.mocked(get).mockResolvedValueOnce(new Response(xml, { status: 200 }));

		const posts = await readFeed('https://x.substack.com');

		expect(posts).toHaveLength(1);
		expect(posts[0].title).toBe('Un libro en cada maleta');
		expect(posts[0].slug).toBe('un-libro');
		expect(posts[0].date).toBe('2026-07-31T05:02:09.000Z');
		// The feed carries none of this. Zero, and metrics that depend on it don't show.
		expect(posts[0].reactions).toBe(0);
		expect(posts[0].comments).toBe(0);
		expect(posts[0].words).toBe(0);
	});

	it('never reads title or pubDate out of the content:encoded body', async () => {
		// `<title>` and `<pubDate>` only ever get matched inside `head`, the
		// slice of the chunk BEFORE `<content:encoded>`. Real Substack items
		// always carry their own title/pubDate ahead of content:encoded (see
		// the header comment), so with a real item this guard is provably
		// inert: a JS regex match with no `g` flag always returns the
		// leftmost match, and `head` is a strict prefix of the raw chunk, so
		// a match found in `head` is always the same match found in the full
		// chunk — nothing after the cut point can ever outrank it. So the one
		// case where the cut actually changes the outcome is a malformed item
		// that carries NO title/pubDate tag of its own: without the cut, a
		// title- or pubDate-shaped string sitting anywhere inside the body
		// would be picked up as if it were real data. This item has no
		// `<title>` or `<pubDate>` of its own — only inside content:encoded —
		// so it must be dropped rather than manufactured from its body text.
		const xml = `<rss><channel><item>
			<title><![CDATA[Un libro en cada maleta]]></title>
			<description><![CDATA[Recomendaciones de verano]]></description>
			<link>https://x.substack.com/p/un-libro</link>
			<pubDate>Fri, 31 Jul 2026 05:02:09 GMT</pubDate>
		</item><item>
			<link>https://x.substack.com/p/decoy-only</link>
			<content:encoded><![CDATA[<title>Decoy title from the body</title><pubDate>Mon, 01 Jan 2001 00:00:00 GMT</pubDate>]]></content:encoded>
		</item></channel></rss>`;
		vi.mocked(get).mockResolvedValueOnce(new Response(xml, { status: 200 }));

		const posts = await readFeed('https://x.substack.com');

		// Only the first, well-formed item survives; the decoy-only one never
		// turns into a post, and its body text never leaks into `title`.
		expect(posts).toHaveLength(1);
		expect(posts[0].title).toBe('Un libro en cada maleta');
		expect(posts.some((p) => p.title.includes('Decoy'))).toBe(false);
	});
});
