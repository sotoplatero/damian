/**
 * Usage limits, all in one place.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT THIS IS AND WHAT IT ISN'T
 *
 * The counter lives in the process's memory. On serverless each instance has its
 * own, so the real limit is the configured one MULTIPLIED by however many
 * instances the platform keeps warm. With this site's traffic that will be one
 * or two, so it does stop real abuse; but it is not exact and must not be sold
 * as if it were.
 *
 * An exact daily limit needs a shared store (Redis/KV). That is the only change
 * still pending: `overLimit`'s signature wouldn't have to change, only its
 * insides.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * WHY THE KEY ISN'T ALWAYS THE IP
 *
 * An IP is not a person. On mobile networks thousands of users leave through a
 * handful of IPs, and in an office everyone shares one. A low per-IP limit locks
 * out the colleagues of whoever spent it.
 *
 * That is why the expensive path is limited by EMAIL, which does identify
 * someone, and the free one by IP with generous headroom.
 */

type Hit = { at: number };

/** One bucket per name, so one endpoint can't eat another's quota. */
const buckets = new Map<string, Map<string, Hit[]>>();

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/**
 * The site's limits, together so they can be read at a glance.
 *
 * `max` is per `windowMs` and per key. The noted cost is what each one prevents
 * in the worst case, which is the reason the number is that one and not another.
 */
export const LIMITS = {
	/** Any tool's free step. Generous: there is almost no spend here. */
	toolPreview: { max: 15, windowMs: DAY_MS },

	/**
	 * The expensive step, the one that runs after the email is handed over. Three
	 * a day per address is plenty for one's own site, a client's, and a retry. And
	 * it forces an attacker to obtain a valid, non-disposable address every three
	 * uses.
	 */
	toolDelivery: { max: 3, windowMs: DAY_MS },

	/** Per-IP ceiling on the expensive step, so nobody chains a hundred emails from one. */
	toolDeliveryPerIp: { max: 10, windowMs: DAY_MS },

	/** Google Places costs ~$0.086 per evaluation. Ten a day is ~$0.86 per IP. */
	places: { max: 10, windowMs: DAY_MS },

	/** Autocomplete fires on every keystroke. Generous, but capped. */
	placesAutocomplete: { max: 60, windowMs: HOUR_MS },

	/**
	 * The /postcard walk. It costs no money — there is no model call and no email —
	 * but each walk is up to 50 requests to someone else's server. This limit
	 * exists to protect Substack, not the bill. Keyed by IP because there is no
	 * email to ask for: it is the only tool with no gate.
	 */
	authorCard: { max: 20, windowMs: HOUR_MS }
} as const;

export type LimitName = keyof typeof LIMITS;

/**
 * Counts an attempt and says whether the limit has been passed.
 *
 * It counts ALWAYS, even when it returns true: that way whoever keeps pushing
 * doesn't recover any sooner by carrying on.
 */
export function overLimit(name: LimitName, key: string): boolean {
	const { max, windowMs } = LIMITS[name];
	const now = Date.now();

	let bucket = buckets.get(name);
	if (!bucket) {
		bucket = new Map();
		buckets.set(name, bucket);
	}

	const recent = (bucket.get(key) ?? []).filter((hit) => now - hit.at < windowMs);
	recent.push({ at: now });
	bucket.set(key, recent);

	// Lazy pruning: without this the Map grows for as long as the instance lives.
	if (bucket.size > 5_000) {
		for (const [k, hits] of bucket) {
			if (hits.every((hit) => now - hit.at >= windowMs)) bucket.delete(k);
		}
	}

	return recent.length > max;
}

/** How much is left in the window, so it can be said in the error message. */
export function remaining(name: LimitName, key: string): number {
	const { max, windowMs } = LIMITS[name];
	const now = Date.now();
	const hits = (buckets.get(name)?.get(key) ?? []).filter((hit) => now - hit.at < windowMs);
	return Math.max(0, max - hits.length);
}
