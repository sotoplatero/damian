import type { Course, ModuleAnswer } from './types';

/**
 * Revalidate on the server whatever the browser sent.
 *
 * The runner is ours, but the `fetch` can be made by anyone with a console open.
 * Everything arriving here is treated as a stranger's text, because it ends up
 * inside an email sent from our domain.
 *
 * THE RULE EVERYTHING ELSE FOLLOWS FROM: take NUMBERS and IDENTIFIERS from the
 * request, never labels. Category names and option text are read from the course
 * definition, which lives in the repo. So the only thing a stranger can get into
 * the email is the line items they type in module 1 — where the field is free by
 * design — and those go through `escapeMarkdown` when the report is built.
 */

/** Ceiling in case someone sends 1e308: it would break formatting and say nothing. */
const MAX_EUROS = 10_000_000;
/** Plenty of line items for anyone; cuts off a hand-generated list. */
const MAX_ROWS = 40;
const MAX_LABEL = 80;

function money(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
	return Math.min(value, MAX_EUROS);
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim().slice(0, MAX_LABEL) : '';
}

/**
 * A clean answer, or `undefined` if it doesn't match what the module expects.
 *
 * Returning `undefined` instead of a half-built object is deliberate: the report
 * already knows how to say "you skipped this one", which beats a module that
 * renders with half-invented data and nobody notices.
 */
function sanitizeAnswer(course: Course, moduleId: string, input: unknown): ModuleAnswer | undefined {
	const module = course.modules.find((item) => item.id === moduleId);
	if (!module || !input || typeof input !== 'object') return undefined;

	const raw = input as Record<string, unknown>;
	if (raw.kind !== module.interaction.kind) return undefined;

	switch (module.interaction.kind) {
		case 'estimate': {
			const rows = Array.isArray(raw.rows) ? raw.rows.slice(0, MAX_ROWS) : [];
			const clean = rows
				.map((row) => {
					const entry = (row ?? {}) as Record<string, unknown>;
					return { label: text(entry.label), monthly: money(entry.monthly) };
				})
				.filter((row) => row.monthly > 0);
			if (!clean.length) return undefined;
			return { kind: 'estimate', guess: money(raw.guess), rows: clean };
		}

		case 'budget': {
			const income = money(raw.income);
			if (income <= 0) return undefined;

			// Labels come from the course and amounts from the request, paired by
			// position. If the client sends anything else, it lands as zero.
			const sent = Array.isArray(raw.categories) ? raw.categories : [];
			const categories = module.interaction.categories.map((category, index) => {
				const entry = (sent[index] ?? {}) as Record<string, unknown>;
				return { label: category.label, monthly: money(entry.monthly) };
			});

			return { kind: 'budget', income, savings: money(raw.savings), categories };
		}

		case 'cases': {
			const items = module.interaction.items;
			const sent = Array.isArray(raw.picks) ? raw.picks : [];
			const picks: { caseId: string; pickedId: string }[] = [];

			for (const pick of sent) {
				const entry = (pick ?? {}) as Record<string, unknown>;
				const study = items.find((item) => item.id === entry.caseId);
				if (!study) continue;
				// The option has to exist in THAT case. Without this you could send any
				// id and the report would print it as "your answer".
				const option = study.options.find((item) => item.id === entry.pickedId);
				if (!option) continue;
				if (picks.some((item) => item.caseId === study.id)) continue;
				picks.push({ caseId: study.id, pickedId: option.id });
			}

			if (!picks.length) return undefined;
			return { kind: 'cases', picks };
		}
	}
}

/** The whole course's answers, in the order of its modules. */
export function sanitizeAnswers(course: Course, input: unknown): Record<string, ModuleAnswer> {
	if (!input || typeof input !== 'object') return {};
	const raw = input as Record<string, unknown>;
	const answers: Record<string, ModuleAnswer> = {};

	for (const module of course.modules) {
		const answer = sanitizeAnswer(course, module.id, raw[module.id]);
		if (answer) answers[module.id] = answer;
	}

	return answers;
}
