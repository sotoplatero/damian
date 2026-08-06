import { t } from './copy';
import { escapeMarkdown } from '$lib/tools/markdown';
import { annualise, budgetBalance, estimateVerdict, formatEuros, savingsRate } from './engine';
import type { Course, Module, ModuleAnswer, Reference } from './types';

/**
 * The email that's left once the tab is closed.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THERE IS NO SCORE, AND THAT IS NOT AN OVERSIGHT
 *
 * You grade things people can retake. Somebody's finances are not that: a "4 out
 * of 10" doesn't say what to do on Monday, it discourages, and above all it turns
 * this into our verdict on a person's money. This course explains a mechanism; it
 * does not rule on anyone.
 *
 * This repo already walked that road in `/tool/newsletter`: `score()` and
 * `PENALTY` were deleted because any aggregate got worse as the diagnosis got
 * better — a 39k-subscriber publication scored 2 out of 100. Here the same
 * problem applies and there is a person behind the numbers.
 *
 * What it does carry: their figures, what they answered, the reading, and the
 * links. That can actually be used.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * BUILT IN ONE LOOP over the modules, not in a chain of conditional sections.
 * `newsletter/report.ts` had eleven and each one could vanish silently without
 * anything failing. With a loop, a module that doesn't appear is a module that
 * doesn't exist.
 *
 * NO MARKDOWN TABLES: the email shell doesn't style them and they overflow at
 * 320px. Lists and paragraphs, which is what it knows how to render.
 *
 * The creator is not named anywhere in here either — same rule as the page. The
 * credit lives in the email shell (`src/lib/emails/course.md`) and in the links.
 */

/**
 * Labels come from the SAME file the page reads — one parse, in `./copy` — so
 * the two can never tell different stories about the same thing.
 */
function label(key: string, fallback: string): string {
	return t[key] ?? fallback;
}

function renderReferences(list: Reference[]): string[] {
	const lines = [`**${label('refsTitle', 'De dónde sale esto')}**`, ''];
	for (const reference of list) {
		const tag =
			reference.audience === 'paid' ? label('refPaid', 'suscriptores') : label('refFree', 'abierto');
		lines.push(`- [${reference.title}](${reference.url}) — ${tag}`);
	}
	lines.push('');
	return lines;
}

/**
 * What the learner did in one module. Returns lines rather than text: the caller
 * decides the spacing, so there aren't two competing ideas of it.
 */
function renderAnswer(module: Module, answer: ModuleAnswer): string[] {
	const lines: string[] = [];

	switch (answer.kind) {
		case 'estimate': {
			const { monthly, annual } = annualise(answer);
			const verdict = estimateVerdict(answer);
			const interaction = module.interaction.kind === 'estimate' ? module.interaction : null;

			// Guess and total are both MONTHLY, because that's the unit the guess was
			// made in. The annual figure gets its own line: it isn't part of the
			// comparison, it's the point of the module.
			lines.push(
				`**${label('estGuessLabel', 'Lo que creías')}:** ${formatEuros(answer.guess)} al mes`
			);
			lines.push('');
			lines.push(
				`**${label('estRealLabel', 'Lo que suman de verdad')}:** ${formatEuros(monthly)} al mes`
			);
			lines.push('');
			lines.push(`**${label('estAnnualLabel', 'Y eso, al año')}:** ${formatEuros(annual)}`);
			lines.push('');

			if (interaction) {
				lines.push(
					verdict === 'under'
						? interaction.revealUnder
						: verdict === 'over'
							? interaction.revealOver
							: interaction.revealClose
				);
				lines.push('');
			}

			lines.push(`**${label('estBreakdown', 'Uno a uno, al año')}**`);
			lines.push('');
			for (const row of answer.rows) {
				// The learner wrote this label: if it starts with "#" or "-" the mail
				// client renders it as a heading or a bullet.
				lines.push(`- ${escapeMarkdown(row.label)}: ${formatEuros(row.monthly * 12)}`);
			}
			lines.push('');
			break;
		}

		case 'budget': {
			const interaction = module.interaction.kind === 'budget' ? module.interaction : null;
			const balance = budgetBalance(answer);

			lines.push(`**${label('budIncome', 'Lo que entra')}:** ${formatEuros(answer.income)} al mes`);
			lines.push('');
			lines.push(
				`**${label('budSavings', 'Lo que apartas')}:** ${formatEuros(answer.savings)} al mes — ` +
					`${label('budRate', 'el {rate}% de lo que entra').replace('{rate}', savingsRate(answer).toFixed(0))}`
			);
			lines.push('');
			lines.push(`**${label('budCategories', 'Y el resto')}**`);
			lines.push('');
			for (const category of answer.categories) {
				if (category.monthly <= 0) continue;
				lines.push(`- ${escapeMarkdown(category.label)}: ${formatEuros(category.monthly)}`);
			}
			lines.push('');

			if (Math.abs(balance) > 1) {
				// Shouldn't happen: the runner won't advance without balancing. If it
				// does, say so rather than hide it — hiding is worse than an imperfect
				// email.
				lines.push(`_${label('budUnbalancedNote', 'Esto no llegó a cuadrar del todo.')}_`);
				lines.push('');
			} else if (interaction) {
				lines.push(interaction.reveal);
				lines.push('');
			}
			break;
		}

		case 'cases': {
			const interaction = module.interaction.kind === 'cases' ? module.interaction : null;
			if (!interaction) break;

			for (const study of interaction.items) {
				const pick = answer.picks.find((item) => item.caseId === study.id);
				if (!pick) continue;
				const chosen = study.options.find((option) => option.id === pick.pickedId);
				const taught = study.options.find((option) => option.id === study.answerId);

				lines.push(`**${study.question}**`);
				lines.push('');
				lines.push(`_${study.situation}_`);
				lines.push('');
				if (chosen) lines.push(`- ${label('caseYours', 'Tu respuesta')}: ${chosen.label}`);
				// The second line only when they differ. Printing both when they match
				// repeated the same sentence word for word and the email looked broken.
				if (taught && chosen?.id !== taught.id) {
					lines.push(`- ${label('caseAnswer', 'La respuesta')}: ${taught.label}`);
				}
				lines.push('');
				lines.push(study.reveal);
				lines.push('');
			}
			break;
		}
	}

	return lines;
}

export function buildReport(course: Course, answers: Record<string, ModuleAnswer>): string {
	const lines: string[] = [];

	lines.push(`## ${course.title}`);
	lines.push('');
	lines.push(course.tagline);
	lines.push('');
	lines.push(`_${course.disclaimer}_`);
	lines.push('');
	lines.push('---');
	lines.push('');

	// ONE LOOP. A module with no answer is skipped and said so; it doesn't vanish.
	for (const [index, module] of course.modules.entries()) {
		lines.push(`### ${index + 1}. ${module.title}`);
		lines.push('');

		const answer = answers[module.id];
		if (!answer) {
			lines.push(`_${label('reportSkipped', 'Este módulo te lo saltaste.')}_`);
			lines.push('');
		} else {
			lines.push(...renderAnswer(module, answer));
		}

		lines.push(...renderReferences(module.references));
		lines.push('---');
		lines.push('');
	}

	lines.push(`### ${course.handoff.title}`);
	lines.push('');
	lines.push(course.handoff.text);
	lines.push('');
	lines.push(`- [${course.handoff.reference.title}](${course.handoff.reference.url})`);
	lines.push('');

	return lines.join('\n');
}
