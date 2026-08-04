import type { Metrics } from './metrics';

/**
 * The card's sentences, chosen by rule.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE RULE THAT OVERRIDES THE OTHERS
 *
 * **If the figure isn't good enough to flatter, there is no sentence.** It
 * returns `null` and the number stands on its own.
 *
 * A consolation prize for someone six weeks in is worse than silence, and it is
 * the fastest way to make a gift sound condescending. This card reaches someone
 * who never asked for it.
 *
 * There is no model here. These are templates: the same URL always yields the
 * same sentence, so what Damian sees before sending the link is exactly what
 * whoever opens it will see.
 *
 * The strings are Spanish because a visitor reads them. The comments are
 * English, like the rest of the code.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type Lines = {
	streak: string | null;
	words: string | null;
	likes: string | null;
	cadence: string | null;
	hour: string | null;
};

const es = (n: number) => n.toLocaleString('es-ES');

/** Thresholds for the streak sentence. Below the lower one, silence. */
const STREAK_LONG = 200;
const STREAK_MID = 50;

/**
 * Spanish hour names. Twelve-hour clock, because "las diecinueve" is not how
 * anyone speaks; the part of day comes from `hourLine`.
 */
const HOURS = [
	'doce', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho',
	'nueve', 'diez', 'once', 'doce', 'una', 'dos', 'tres', 'cuatro', 'cinco',
	'seis', 'siete', 'ocho', 'nueve', 'diez', 'once'
];

function streakLine(m: Metrics): string | null {
	const weeks = m.longestStreak;
	if (weeks < STREAK_MID) return null;

	if (m.streakIsRecord) {
		return `${es(weeks)} semanas seguidas publicando, y la racha sigue viva ahora mismo. Su mejor racha es la de hoy.`;
	}
	if (weeks >= STREAK_LONG) {
		const years = Math.floor(weeks / 52);
		return `${es(weeks)} semanas seguidas. ${years} años sin fallar una. Eso ya no es constancia, es oficio.`;
	}
	return `${es(weeks)} semanas seguidas apareciendo. Sin saltarse una.`;
}

function wordsLine(m: Metrics): string | null {
	const first = m.words[0];
	if (!first) return null;
	return `Escribe de ${first.word} y se le nota: ${es(first.posts)} titulares.`;
}

function likesLine(m: Metrics): string | null {
	const top = m.mostLiked;
	if (!top) return null;
	return `Su techo son ${es(top.post.reactions)} likes. Lo hizo con «${top.post.title}».`;
}

function cadenceLine(m: Metrics): string | null {
	// Only where there is history to situate: one year is not an evolution. The
	// year in progress is excluded because it always looks short.
	const closed = m.years.filter((y) => !y.inProgress);
	if (closed.length < 2) return null;
	const average = closed.reduce((sum, y) => sum + y.perMonth, 0) / closed.length;
	return `${average.toFixed(1)} posts al mes de media, ${closed.length} años seguidos.`;
}

function hourLine(m: Metrics): string | null {
	if (!m.hour) return null;
	const { hour, share } = m.hour;
	const percent = Math.round(share * 100);
	const when =
		hour < 6
			? 'de la madrugada'
			: hour < 13
				? 'de la mañana'
				: hour < 21
					? 'de la tarde'
					: 'de la noche';
	return `Publica a las ${HOURS[hour]} ${when}: el ${percent}% de sus posts salen en esa franja.`;
}

export function linesFor(m: Metrics): Lines {
	return {
		streak: streakLine(m),
		words: wordsLine(m),
		likes: likesLine(m),
		cadence: cadenceLine(m),
		hour: hourLine(m)
	};
}
