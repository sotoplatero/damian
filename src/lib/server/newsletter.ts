import { get, readBody as body, decode, preloads, toOrigin, UnreadableError } from './substack';

// Re-exported so consumers of this module don't need to import from substack.
export { UnreadableError };

/**
 * Collects everything a Substack newsletter shows from the outside.
 *
 * Two requests and it comes out already structured, with no HTML guessing:
 *
 *  1. The homepage. From there come the meta tags, the h1, the button texts,
 *     and `window._preloads`, which carries the full publication object
 *     (name, subtitle, logo, cover, brand color, payment state...).
 *  2. `/api/v1/archive`, undocumented but the one its own site uses. It gives,
 *     per post: title, subtitle, date, slug, free or paid, word count,
 *     reactions, comments, cover, and — most important — the
 *     `search_engine_title` and `search_engine_description` fields.
 *
 * Substack's public GETs go through fine from the server: what sits behind
 * Cloudflare is the signup POST, not this (verified).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT'S IN THE PAYLOAD AND ISN'T READ
 *
 * `_preloads.pub` carries **142 keys** and the archive **64 fields per post**
 * (measured on kloshletter.substack.com, July 2026). Only what feeds an audit
 * rule is read here. Before adding a field, check that it exists and has a
 * value on a real publication: several are declared and come back `null`
 * (`free_subscription_benefits`, `plans` with no payments enabled).
 *
 * Two that deceive:
 *   - `body_html` **exists as a key in `/api/v1/archive` and arrives empty.**
 *     The body is only obtained per post; see `collectPostBodies`.
 *   - `freeSubscriberCount` comes in the payload, but whether it *shows* on
 *     the homepage depends on a setting that doesn't appear as a key. To
 *     judge social proof use `rankingDetail`, `hasRecommendations`,
 *     `showRecsOnHomepage` and `welcomeBlurbs`, which are presentation state.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Enough to see cadence and patterns without downloading the whole archive. */
const POSTS = 20;
/**
 * How many post bodies are downloaded at most. Each one is a ~185KB request,
 * so this only happens in the paid step: the free step stays at the usual
 * two requests.
 */
const POST_BODIES = 5;

export type NewsletterPost = {
	title: string;
	subtitle: string;
	slug: string;
	date: string;
	/** 'everyone' is free; anything else is paid or subscribers-only. */
	audience: string;
	words: number;
	reactions: number;
	comments: number;
	restacks: number;
	hasCover: boolean;
	seoTitle: string | null;
	seoDescription: string | null;
	section: string | null;
	/** The summary Substack uses as the post's description. Almost always populated. */
	description: string;
	/** Title for social. A different field from the search engine one. */
	socialTitle: string | null;
};

/**
 * A post's body, for looking inside.
 *
 * Both formats are kept because both are needed: the HTML to detect what are
 * Substack editor classes (buttons, widgets) and the text so the model READS
 * the number. It used to only store the HTML and send the model a summary
 * from our own regexes — which is why it never found anything that wasn't
 * already anticipated by a rule.
 */
export type PostBody = {
	slug: string;
	title: string;
	date: string;
	html: string;
	text: string;
};

/**
 * HTML to readable text.
 *
 * **Block boundaries become a line break BEFORE tags are stripped.** This is
 * not a minor detail: stripping tags outright glues the end of a paragraph to
 * the start of the next one, and errors appear that don't exist. Writing the
 * reference audit, this produced six false punctuation errors in an issue that
 * only had one. If the model receives the text stitched together wrong, it
 * will report those six with full confidence.
 */
export function toPlainText(html: string): string {
	const spaced = html
		.replace(/<br[^>]*>/gi, '\n')
		.replace(/<\/(p|div|h[1-6]|li|blockquote|tr|td|figcaption)>/gi, '\n');
	return decode(spaced.replace(/<[^>]+>/g, ''))
		.replace(/[ \t]+/g, ' ')
		.replace(/ ?\n ?/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

export type NewsletterSnapshot = {
	/** Final origin, already normalized (accounts for custom domains). */
	url: string;
	/** Name exactly as Substack returns it, untrimmed: extra whitespace is itself a finding. */
	name: string;
	/** The homepage subtitle. Substack calls it hero_text. */
	tagline: string;
	authorName: string;
	authorBio: string;
	language: string;
	hasLogo: boolean;
	hasCoverPhoto: boolean;
	/** Accent color. #FF6719 is Substack's factory-default orange. */
	brandColor: string | null;
	customDomain: string | null;
	paymentsEnabled: boolean;
	/** What the <title> and meta tags say — what shows up on Google and when shared. */
	pageTitle: string;
	metaDescription: string;
	ogImage: string | null;
	h1: string[];
	/** Text of the homepage buttons: this is where the CTA comes from. */
	buttons: string[];
	posts: NewsletterPost[];

	// --- Social proof: why someone should believe you ---
	/** Free subscribers, already as a number. Substack gives them formatted ("7,000"). */
	subscriberCount: number | null;
	/** The vague form Substack shows publicly ("thousands of subscribers"). */
	subscriberCountLabel: string;
	/** The badge line: "Launched 9 months ago", "Top 10 in Politics"... */
	rankingDetail: string;
	/** Greater than 0 if the author has a bestseller badge. */
	bestsellerTier: number;
	hasRecommendations: boolean;
	showRecsOnHomepage: boolean;
	/** How many testimonials are on the welcome page. Zero is normal. */
	welcomeBlurbs: number;

	// --- How the homepage presents itself ---
	/**
	 * If false, the homepage doesn't show the module with the name and the promise.
	 *
	 * **DO NOT write a rule against this.** It was measured: `false` in 4 of 4
	 * publications (Kloshletter, Nada importa, Liderar, Fleet Street), two of
	 * them with a bestseller badge. It's the default state for the `newspaper`
	 * and `magaziney` designs, not neglect. Collected as context.
	 */
	showIntroModule: boolean;
	hideIntroTitle: boolean;
	hideIntroSubtitle: boolean;
	/** "newspaper", "personal"... changes what a first-time visitor sees. */
	homepageType: string;

	// --- Search engines: the switch that turns it all off ---
	/** If true, you've told Google not to index you. */
	noIndex: boolean;
	noFollow: boolean;

	// --- Age, inbox, and paywall ---
	/**
	 * Date of the first post.
	 *
	 * Careful: on publications that imported their archive from another
	 * platform, this predates Substack itself (liderar.substack.com says
	 * 2011). To compute age, bound it with `created_at`, which is the reliable
	 * publication creation date.
	 */
	firstPostDate: string;
	/** When the publication was created on Substack. The reliable one of the two dates. */
	createdAt: string;
	/** The name shown as the sender in the inbox. Doesn't have to match the publication's name. */
	emailFromName: string;
	/** How much a non-subscriber can read of a paid post. null is the default. */
	postPreviewLimit: number | null;
	inviteOnly: boolean;
	/** How many paid plans are configured. */
	planCount: number;
};

function text(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function bool(value: unknown): boolean {
	return value === true;
}

function num(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Substack gives subscriber counts already formatted ("7,000"), so it has to be undone. */
function count(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value !== 'string') return null;
	const digits = value.replace(/[^\d]/g, '');
	return digits ? Number(digits) : null;
}

/**
 * The normalized origin of whatever the visitor typed, without downloading
 * anything.
 *
 * Exists so the cache key can be built in the unlock step, where only the raw
 * URL is available and there's no snapshot yet. It has to normalize THE SAME
 * WAY as `collectNewsletter`, so both go through `toOrigin`.
 */
export function normalizeOrigin(raw: string): string | null {
	try {
		return toOrigin(raw).toString().replace(/\/$/, '');
	} catch {
		return null;
	}
}

function meta(html: string, key: string): string {
	for (const tag of html.match(/<meta[^>]+>/gi) ?? []) {
		const name = tag.match(/(?:name|property)="([^"]+)"/i)?.[1];
		if (name?.toLowerCase() !== key) continue;
		const content = tag.match(/content="([^"]*)"/i)?.[1];
		if (content) return decode(content);
	}
	return '';
}

function tags(html: string, tag: string): string[] {
	const found: string[] = [];
	for (const match of html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi'))) {
		const clean = decode(match[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
		if (clean && clean.length < 120 && !found.includes(clean)) found.push(clean);
	}
	return found;
}

function readPosts(raw: unknown): NewsletterPost[] {
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
		.map((p) => ({
			title: text(p.title),
			subtitle: text(p.subtitle),
			slug: text(p.slug),
			date: text(p.post_date),
			audience: text(p.audience) || 'everyone',
			words: typeof p.wordcount === 'number' ? p.wordcount : 0,
			reactions: typeof p.reaction_count === 'number' ? p.reaction_count : 0,
			comments: typeof p.comment_count === 'number' ? p.comment_count : 0,
			restacks: Array.isArray(p.restacks) ? p.restacks.length : 0,
			hasCover: !!text(p.cover_image),
			seoTitle: text(p.search_engine_title) || null,
			seoDescription: text(p.search_engine_description) || null,
			section: text(p.section_name) || null,
			description: text(p.description),
			socialTitle: text(p.social_title) || null
		}))
		.filter((p) => p.title);
}

/**
 * Reads a Substack newsletter. Throws `UnreadableError` if the URL isn't a
 * Substack publication or can't be read.
 */
export async function collectNewsletter(rawUrl: string): Promise<NewsletterSnapshot> {
	const origin = toOrigin(rawUrl);

	const [homeResponse, archiveResponse] = await Promise.all([
		get(origin, 'text/html'),
		get(new URL(`/api/v1/archive?sort=new&limit=${POSTS}`, origin), 'application/json')
	]);

	if (homeResponse.status === 404) throw new UnreadableError('not_found');
	if (!homeResponse.ok) throw new UnreadableError('blocked');

	const html = await body(homeResponse);
	// `subscriberCountDetails` and `welcomePageData` hang off the root, not `pub`.
	const root = preloads(html);
	const pub = (root.pub ?? {}) as Record<string, unknown>;
	const welcome = (root.welcomePageData ?? {}) as Record<string, unknown>;

	// With no publication object and no archive, this isn't a Substack.
	let posts: NewsletterPost[] = [];
	if (archiveResponse.ok) {
		try {
			posts = readPosts(JSON.parse(await body(archiveResponse)));
		} catch {
			posts = [];
		}
	}
	if (!pub.name && posts.length === 0) throw new UnreadableError('empty');

	return {
		url: origin.toString().replace(/\/$/, ''),
		name: text(pub.name),
		tagline: text(pub.hero_text),
		authorName: text(pub.author_name),
		authorBio: text(pub.author_bio),
		language: text(pub.language),
		hasLogo: !!text(pub.logo_url),
		hasCoverPhoto: !!text(pub.cover_photo_url),
		brandColor: text(pub.theme_var_background_pop) || null,
		customDomain: text(pub.custom_domain) || null,
		paymentsEnabled: text(pub.payments_state) === 'enabled',
		pageTitle: decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim(),
		metaDescription: meta(html, 'description'),
		ogImage: meta(html, 'og:image') || null,
		h1: tags(html, 'h1'),
		buttons: tags(html, 'button'),
		posts,

		subscriberCount: count(pub.freeSubscriberCount),
		subscriberCountLabel: text(root.subscriberCountDetails),
		rankingDetail: text(pub.rankingDetail),
		bestsellerTier: num(pub.author_bestseller_tier) ?? 0,
		hasRecommendations: bool(pub.has_recommendations),
		showRecsOnHomepage: bool(pub.show_recs_on_homepage),
		welcomeBlurbs: Array.isArray(welcome.blurbs) ? welcome.blurbs.length : 0,

		// `showIntroModule` is the only one of the three that Substack always sends
		// as a boolean; the `hide_intro_*` ones arrive as null when untouched.
		showIntroModule: bool(pub.showIntroModule),
		hideIntroTitle: bool(pub.hide_intro_title),
		hideIntroSubtitle: bool(pub.hide_intro_subtitle),
		homepageType: text(pub.homepage_type),

		noIndex: bool(pub.no_index),
		noFollow: bool(pub.no_follow),

		firstPostDate: text(pub.first_post_date),
		createdAt: text(pub.created_at),
		emailFromName: text(pub.email_from_name),
		postPreviewLimit: num(pub.post_preview_limit),
		inviteOnly: bool(pub.invite_only),
		planCount: Array.isArray(pub.plans) ? pub.plans.length : 0
	};
}

/**
 * The bodies of up to `POST_BODIES` posts, for looking inside: whether there's
 * a CTA, how they close, how many links go out.
 *
 * The body CANNOT be obtained from the archive (`body_html` arrives empty) nor
 * from `/api/v1/posts/by-slug/{slug}`, which 302s to the page. It has to
 * download `/p/{slug}` and pull it from `_preloads.post`.
 *
 * Goes through `get()`, so it inherits the SSRF guard and the byte cap. A post
 * that fails drops out of the list without failing the evaluation: three
 * bodies are already enough to see a pattern, and ending up with none just
 * means those rules don't fire.
 */
export async function collectPostBodies(origin: string, slugs: string[]): Promise<PostBody[]> {
	let base: URL;
	try {
		base = new URL(origin);
	} catch {
		return [];
	}

	const bodies = await Promise.all(
		slugs.slice(0, POST_BODIES).map(async (slug): Promise<PostBody | null> => {
			try {
				const response = await get(new URL(`/p/${encodeURIComponent(slug)}`, base), 'text/html');
				if (!response.ok) return null;
				const post = (preloads(await body(response)).post ?? {}) as Record<string, unknown>;
				const postHtml = text(post.body_html);
				if (!postHtml) return null;
				return {
					slug,
					title: text(post.title),
					date: text(post.post_date),
					html: postHtml,
					text: toPlainText(postHtml)
				};
			} catch {
				return null;
			}
		})
	);

	return bodies.filter((b): b is PostBody => b !== null);
}
