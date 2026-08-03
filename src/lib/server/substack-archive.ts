/**
 * A post as `/api/v1/archive` returns it, already reduced to what's used.
 *
 * The nine fields are MEASURED as present in 868/868, 128/128 and 167/167
 * posts of three real publications, so they are not optional. The ones that
 * can be missing (`subtitle`, `sectionName`) carry their empty value.
 *
 * DO NOT add `restacks`: the field exists in the response and arrives as an
 * empty array in 868 of 868 posts. It was checked; it's dead.
 */
export type ArchivePost = {
	title: string;
	subtitle: string;
	slug: string;
	/** Full ISO, with time. The time is used: it's a card datum. */
	date: string;
	/** 'everyone' is free; 'only_paid' and the rest are paid. */
	audience: string;
	/** 'newsletter' | 'podcast' | 'restack'. A restack is another person's post. */
	type: string;
	words: number;
	reactions: number;
	comments: number;
	/** Replies inside threads. Adds up separately from `comments`. */
	childComments: number;
	sectionName: string;
};
