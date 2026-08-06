/**
 * The vocabulary of an interactive course.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT THIS IS AND WHAT IT ISN'T
 *
 * A course is NOT one of the tools in `src/routes/tool/*`. Those send text to a
 * model and show you half of what comes back; this is a deterministic simulator.
 * No `openai.ts` here, no `scrape.ts`, no `quotes.ts`, no `voice.ts`. If someone
 * ever wires a model into this, let it be on purpose and not out of habit.
 *
 * Everything a module teaches comes out of arithmetic on what the learner typed.
 * No number is decided by a coefficient of ours: a simulation whose outcome is
 * set by a constant we wrote doesn't teach anything, it shows a rigged coin.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * THE ENGINE IS GENERIC, THE INTERACTION TYPES ARE NOT
 *
 * `Course`, `Module` and the runner work for any creator. The three interaction
 * types below are EXACTLY the ones the first course needs, and there is no
 * fourth one sitting there for show. When creator #2 needs another, add it to
 * the union and the compiler will point at every place that fails to render it.
 * Inventing types nobody uses is writing yourself requirements.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE COURSE DOES NOT NAME THE CREATOR IN ITS BODY
 *
 * Attribution is ONE credit line at the foot of the page, plus the reference
 * links. The lessons themselves are written as a course, not as a report about
 * somebody. A page that says "Cris says…" every paragraph reads like a summary
 * of her; a page that just teaches reads like a course.
 *
 * The consequence, and it is not optional: THERE ARE NO PULL QUOTES. A quote
 * with no attribution is worse than naming her — it publishes her sentences as
 * if they were ours. There used to be a `Quote` type here and it was removed for
 * exactly this reason. If you want her voice on the page, you also want her name
 * on the page, and that is a different design.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * A post of the creator's that we send the learner back to.
 *
 * `audience` is NOT decoration. The `paid` ones are the handoff to what the
 * creator sells, and they are the one number a creator can judge at a glance:
 * how many people reach their product from here. It's the reason this exists.
 */
export type Reference = {
	title: string;
	url: string;
	audience: 'free' | 'paid';
};

/**
 * Type 1 — Guess, then count.
 *
 * The learner throws out a figure off the top of their head, then types the
 * components and the engine multiplies by twelve. Both numbers are theirs: the
 * lesson is the gap between what they believed and their own arithmetic, which
 * is why it can't be rigged.
 */
export type EstimateInteraction = {
	kind: 'estimate';
	/** The guess question. Answered BEFORE anything else is shown. */
	guessLabel: string;
	guessHint: string;
	/** Heading for the table of line items. */
	rowsLabel: string;
	rowsHint: string;
	/** Examples for the empty rows. Not data — placeholders. */
	suggestions: string[];
	/**
	 * Reveal text depending on which side the guess fell. Three and not one
	 * because "you were way under" and "you were over" are different lessons,
	 * and telling both of them the same thing would be lying to one.
	 */
	revealUnder: string;
	revealOver: string;
	revealClose: string;
};

/** A budget line. The `hint` says where to get the real number from. */
export type BudgetCategory = {
	id: string;
	label: string;
	hint: string;
};

/**
 * Type 2 — Close the equation.
 *
 * `Income − Expenses − Savings = 0`. Pure arithmetic, nothing to rig.
 *
 * THE ORDER IS THE LESSON: savings is typed BEFORE expenses, not after. Asked
 * last, the learner enters whatever is left over and walks away confirming the
 * exact belief the module exists to dismantle. Asked first, the expenses no
 * longer fit and something has to move — which is the whole point.
 */
export type BudgetInteraction = {
	kind: 'budget';
	incomeLabel: string;
	incomeHint: string;
	savingsLabel: string;
	savingsHint: string;
	categoriesLabel: string;
	categories: BudgetCategory[];
	/** What is shown while the equation doesn't close, on either side. */
	overspentLabel: string;
	leftoverLabel: string;
	balancedLabel: string;
	/** What is shown once it does. */
	reveal: string;
};

/** One case: somebody's situation and the possible readings of it. */
export type CaseStudy = {
	id: string;
	/** The situation. Any words that were somebody else's go in quotes. */
	situation: string;
	question: string;
	options: { id: string; label: string }[];
	/**
	 * The reading the course teaches. It is deliberately never rendered as
	 * "correct" — see `course.md`, where the labels live. The course explains a
	 * mechanism; it does not grade what anyone does with their money.
	 */
	answerId: string;
	reveal: string;
};

/** Type 3 — Diagnosis on real situations. */
export type CasesInteraction = {
	kind: 'cases';
	items: CaseStudy[];
};

export type Interaction = EstimateInteraction | BudgetInteraction | CasesInteraction;

export type Module = {
	id: string;
	title: string;
	/** The idea of the module in a sentence, before touching anything. */
	intro: string;
	interaction: Interaction;
	/** At least one. Rendered when the module closes, and again in the email. */
	references: Reference[];
};

export type Course = {
	slug: string;
	title: string;
	tagline: string;
	/**
	 * Only used for the single credit line and for the links. The body of the
	 * course never mentions it — see the note at the top of this file.
	 */
	creator: {
		name: string;
		publication: string;
		url: string;
	};
	/**
	 * Generic, and it does not name anyone: this course is not financial advice,
	 * full stop. It lives in the data rather than the markup because a course on
	 * another subject needs a different one.
	 */
	disclaimer: string;
	/**
	 * WHERE THIS COURSE STOPS.
	 *
	 * The full method is behind the creator's paywall. Here the mechanics are
	 * used so the learner feels the problem with their own numbers, and then they
	 * are handed over. Building the free version of what somebody sells does not
	 * start a relationship with that person; it ends one.
	 */
	handoff: {
		title: string;
		text: string;
		reference: Reference;
	};
	modules: Module[];
};

/* ────────────────────────────── What the learner answers ──────────────── */

export type EstimateAnswer = {
	kind: 'estimate';
	guess: number;
	rows: { label: string; monthly: number }[];
};

export type BudgetAnswer = {
	kind: 'budget';
	income: number;
	savings: number;
	categories: { label: string; monthly: number }[];
};

export type CasesAnswer = {
	kind: 'cases';
	picks: { caseId: string; pickedId: string }[];
};

export type ModuleAnswer = EstimateAnswer | BudgetAnswer | CasesAnswer;

/**
 * Everything the learner did. It travels from the browser to the server to
 * build the email, so the server revalidates it: none of this is trustworthy
 * just because it came from a `fetch` we wrote.
 */
export type CourseRun = {
	slug: string;
	answers: Record<string, ModuleAnswer>;
};
