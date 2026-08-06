import type { BudgetAnswer, EstimateAnswer, Module, ModuleAnswer } from './types';

/**
 * The arithmetic of the modules, in one place and stateless.
 *
 * It lives here rather than inside each component for one concrete reason: the
 * screen and the email have to say THE SAME THING. `/tool/newsletter` already
 * got the opposite wrong — post bodies were fetched in one step and not the
 * other, and the two reports disagreed — and the result is that whoever gets the
 * email stops trusting what they saw. If the number comes from here, there is
 * only one version of it.
 *
 * Everything in this file is a pure function of what the learner typed. No
 * coefficient of ours decides the outcome of anything.
 */

/** A year is twelve months. Named because it shows up in every module. */
const MONTHS = 12;

/* ───────────────────────────── Estimate ─────────────────────────────── */

/** What the rows add up to per month and per year. Unrounded: rounding is paint. */
export function annualise(answer: EstimateAnswer): { monthly: number; annual: number } {
	const monthly = answer.rows.reduce((total, row) => total + row.monthly, 0);
	return { monthly, annual: monthly * MONTHS };
}

export type EstimateVerdict = 'under' | 'over' | 'close';

/**
 * Which side the guess fell on.
 *
 * The "you got it" band is 15%. It isn't a sacred number: with no band nobody
 * ever gets it and the third text is never read, and with a wide band everybody
 * gets it and the lesson disappears. If you change it, change it while watching
 * people use this, not by feel.
 */
const BAND = 0.15;

/**
 * THE GUESS IS MONTHLY, AND THAT MATTERS.
 *
 * It used to be annual and it was the wrong question: nobody knows what their
 * small recurring charges add up to over a year. That is the entire point of the
 * module — the annual figure is invisible — so opening by demanding it asked for
 * the one number the learner cannot have. People do carry a monthly intuition
 * ("about sixty a month in subscriptions"), so that is what gets compared, and
 * the ×12 lands afterwards as the payoff rather than as the entry fee.
 *
 * If you move this back to annual, you are asking a question with no honest
 * answer and the gap stops meaning anything.
 */
export function estimateVerdict(answer: EstimateAnswer): EstimateVerdict {
	const { monthly } = annualise(answer);
	// With no rows there is nothing to compare against; treat it as under, which
	// is the case the module is about, instead of blowing up.
	if (monthly <= 0) return 'under';
	const gap = Math.abs(answer.guess - monthly) / monthly;
	if (gap <= BAND) return 'close';
	return answer.guess < monthly ? 'under' : 'over';
}

/* ────────────────────────────── Budget ──────────────────────────────── */

/**
 * `Income − Expenses − Savings`. Positive is left over, negative is short,
 * zero closes.
 *
 * Savings subtracts exactly like an expense, which is literally the idea of the
 * module: it's another category, not the remainder of the division.
 */
export function budgetBalance(answer: BudgetAnswer): number {
	const expenses = answer.categories.reduce((total, category) => total + category.monthly, 0);
	return answer.income - expenses - answer.savings;
}

/** One euro of slack: nobody balances a budget to the cent and nobody needs to. */
export const BUDGET_TOLERANCE = 1;

export function budgetCloses(answer: BudgetAnswer): boolean {
	return Math.abs(budgetBalance(answer)) <= BUDGET_TOLERANCE;
}

/** What share of income is being set aside. Display only. */
export function savingsRate(answer: BudgetAnswer): number {
	if (answer.income <= 0) return 0;
	return (answer.savings / answer.income) * 100;
}

/* ───────────────────────────── Completeness ─────────────────────────── */

/**
 * Whether a module is finished. It decides when the learner can move on and what
 * goes in the email, so it lives here instead of scattered across components.
 */
export function isComplete(module: Module, answer: ModuleAnswer | undefined): boolean {
	if (!answer) return false;

	switch (answer.kind) {
		case 'estimate':
			// A guess of zero is a legitimate answer ("none of this applies to me"),
			// so what's required is having answered and having entered at least one
			// row with an amount. No rows, no arithmetic to show.
			return answer.rows.some((row) => row.monthly > 0);

		case 'budget':
			return answer.income > 0 && budgetCloses(answer);

		case 'cases': {
			if (module.interaction.kind !== 'cases') return false;
			const answered = new Set(answer.picks.map((pick) => pick.caseId));
			return module.interaction.items.every((item) => answered.has(item.id));
		}
	}
}

/**
 * WHY THE LEARNER CAN'T MOVE ON YET.
 *
 * A disabled button that doesn't say why is a dead end: the person assumes it's
 * broken, because from where they're sitting it is. This returns a key plus its
 * numbers and the runner turns it into a sentence, so no copy leaks in here.
 *
 * `null` means the module is finished and the button is live.
 */
export type Pending = { key: string; amount?: number; count?: number } | null;

export function pendingReason(module: Module, answer: ModuleAnswer | undefined): Pending {
	if (isComplete(module, answer)) return null;

	switch (module.interaction.kind) {
		case 'estimate': {
			if (!answer || answer.kind !== 'estimate') return { key: 'pendingEstimateGuess' };
			return { key: 'pendingEstimateRows' };
		}

		case 'budget': {
			if (!answer || answer.kind !== 'budget' || answer.income <= 0) {
				return { key: 'pendingBudgetIncome' };
			}
			const balance = budgetBalance(answer);
			return balance < 0
				? { key: 'pendingBudgetShort', amount: Math.abs(balance) }
				: { key: 'pendingBudgetOver', amount: balance };
		}

		case 'cases': {
			const answered =
				answer?.kind === 'cases' ? new Set(answer.picks.map((pick) => pick.caseId)) : new Set();
			const left = module.interaction.items.filter((item) => !answered.has(item.id)).length;
			return { key: left === 1 ? 'pendingCasesOne' : 'pendingCasesMany', count: left };
		}
	}
}

/**
 * Undo one step INSIDE a module, if the module has any.
 *
 * Returns the answer to fall back to, or `false` when there is nothing to undo
 * and the runner should move to the previous module instead.
 *
 * This exists because "Atrás" was jumping straight out of module 1 while the
 * learner was halfway through it — they had answered the guess, were typing line
 * items, pressed back expecting to fix the guess, and landed on the cover. Only
 * the estimate has real inner steps, and it encodes them in the answer itself
 * (no answer → guessing, answer with no rows → listing, rows → revealed), so
 * stepping back is just walking that shape backwards.
 *
 * The other two return `false` on purpose. The budget reveals its fields
 * progressively but they are all one screen, and case answers are deliberately
 * locked once given — undoing them would turn the exercise into a formality.
 */
export function stepBack(module: Module, answer: ModuleAnswer | undefined): ModuleAnswer | undefined | false {
	if (module.interaction.kind !== 'estimate') return false;
	if (!answer || answer.kind !== 'estimate') return false;
	// Revealed → back to the list of line items, keeping the guess.
	if (answer.rows.length) return { ...answer, rows: [] };
	// Listing → back to the guess itself.
	return undefined;
}

/** How many modules are done. The runner uses it for the progress bar. */
export function progress(modules: Module[], answers: Record<string, ModuleAnswer>): number {
	if (!modules.length) return 0;
	const done = modules.filter((module) => isComplete(module, answers[module.id])).length;
	return (done / modules.length) * 100;
}

/* ────────────────────────────── Formatting ──────────────────────────── */

/**
 * Euros, in Spanish, with no decimals.
 *
 * No decimals on purpose: these are figures the learner entered off the top of
 * their head, and printing "1.234,00 €" over an estimate fakes a precision that
 * isn't there.
 */
export function formatEuros(amount: number): string {
	return new Intl.NumberFormat('es-ES', {
		style: 'currency',
		currency: 'EUR',
		maximumFractionDigits: 0
	}).format(Math.round(amount));
}
