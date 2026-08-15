/**
 * The judgment: can this page become a tool, and which kind.
 *
 * Everything here is pure and tested. The model's answer arrives as loose JSON
 * and leaves this module as a `Judgment` or as `null` — there is no third state
 * where half of it is trusted.
 *
 * THE VERDICT IS COMPUTED HERE, NOT ASKED FOR. A model asked "is this
 * convertible?" answers the question it wants to answer; a model asked to
 * defend four separate axes with a literal quote each has to do the work. The
 * bucket is then arithmetic on the axes it defended, so the screen and the
 * rejection log can never disagree with the reasons shown under them.
 */
import { verifyQuote } from '$lib/tools/quotes';

/**
 * The four questions, in the order they are shown. They are held in tension, not
 * averaged: the page shows all four with their reasons, and the count only picks
 * which of three things we say next.
 *
 *  - `procedimental` — repeatable steps, rules or criteria, against ideas,
 *    opinion, news or a story.
 *  - `parametrizable` — the answer changes with what the user puts in. If
 *    everyone gets the same output it is an article with extra steps.
 *  - `repetido` — done more than once. A one-off decision makes a bad tool.
 *  - `tedioso` — doing it by hand costs something: volume, tedium, or holding
 *    many criteria in your head at once.
 */
export const AXES = ['procedimental', 'parametrizable', 'repetido', 'tedioso'] as const;
export type AxisId = (typeof AXES)[number];

/**
 * The six shapes a tool can take. The model names the one that FITS, not the one
 * we happen to build: v1 only builds `generador`, and a page that is really a
 * scorer is worth more to us as a logged "wrong shape" than as a bad generator.
 */
export const SHAPES = ['generador', 'calculadora', 'corrector', 'checklist', 'guia', 'plantilla'] as const;
export type Shape = (typeof SHAPES)[number];

/**
 * Why an axis the model passed was taken down by us.
 *
 * IT HAS TO BE RECORDED, NOT JUST APPLIED. Both checks flip `pasa` to false and
 * leave the model's `motivo` arguing the opposite, which on screen reads as
 * "✕ Sí hay entradas concretas que cambian la salida" — a tool whose whole
 * pitch is showing its interpretation cannot contradict itself in the same
 * line. The page says which check took it down instead of printing the reason.
 */
export type Discarded = 'sin-cita' | 'sin-pasos';

export type Axis = {
	id: AxisId;
	pasa: boolean;
	/** Why, in the visitor's language. Never "the article says": it is their page. */
	motivo: string;
	/** Verbatim fragment of the page. Required to pass; empty when it doesn't. */
	cita: string;
	/** Set only when we overruled a pass. Absent when the model itself said no. */
	descartado?: Discarded;
};

export type Judgment = {
	/** The recurring task of whoever reads the page, as verb + object. Named before anything is judged. */
	tarea: string;
	/**
	 * Is that task work, done on something the person makes or manages?
	 *
	 * The one question that separates an essay giving you criteria for choosing
	 * what to do with your life from an article giving you criteria for a
	 * headline. Both enumerate rules; only one is about a material somebody
	 * brings. Asked as a narrow yes/no instead of leaning on the model to be
	 * strict, because "be strict" is not a criterion.
	 */
	tareaDeTrabajo: boolean;
	/** The steps, rules or criteria the page actually enumerates. Fewer than two and nothing is procedural. */
	pasos: string[];
	axes: Axis[];
	/** One plain sentence: what the tool would do. No jargon, ever. */
	queHace: string;
	forma: Shape;
	/** The nearest thing that WOULD work, when this doesn't. Empty if nothing does. */
	masCercano: string;
};

/**
 * What we tell the visitor. Four outcomes, not three, and the fourth is the one
 * the brief doesn't name:
 *
 *  - `sirve` — four axes defended, and it is a generator. Build it.
 *  - `flojo` — two or three. Offer it, saying plainly that it is the weaker version.
 *  - `otra-forma` — it converts, but into a shape v1 doesn't build. This is a
 *    refusal to the visitor and the most valuable line in the rejection log:
 *    it is what says which shape to build second.
 *  - `no` — fewer than two. Refuse, with the reasons and the nearest thing.
 */
export type Verdict = 'sirve' | 'flojo' | 'otra-forma' | 'no';

export function passedAxes(judgment: Judgment): AxisId[] {
	return judgment.axes.filter((axis) => axis.pasa).map((axis) => axis.id);
}

/**
 * THE FOUR AXES ARE NOT EQUAL, AND PRETENDING THEY WERE COST FIVE OF TWENTY.
 *
 * The brief holds them in tension and counts the passes, which is right for
 * three of them: a page can be weak on repetition or on tedium and still make a
 * tool worth using. `procedimental` is different in kind. Without a procedure
 * there is nothing to turn into anything, and every false positive measured on
 * the corpus — an essay, a diary habit, a product page — was three agreeable
 * axes carrying a fourth that had nothing under it.
 *
 * So it is a gate, not a vote. The other three still count the way the brief
 * says.
 */
export function verdictFor(judgment: Judgment): Verdict {
	const passed = passedAxes(judgment);
	// No material, no tool. An essay handing you criteria for how to live can
	// defend all four axes honestly, and the four axes have no way to see the
	// difference — the difference is whether there is something to put in.
	if (!judgment.tareaDeTrabajo) return 'no';
	if (!passed.includes('procedimental')) return 'no';
	if (passed.length < 2) return 'no';
	if (judgment.forma !== 'generador') return 'otra-forma';
	return passed.length === 4 ? 'sirve' : 'flojo';
}

const MAX_MOTIVO = 400;
const MAX_CITA = 400;

function text(value: unknown, max: number): string {
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * Reads the model's answer into an `Axis[]`, or `null`.
 *
 * Demands the four ids exactly once each. A strict JSON schema cannot say
 * "exactly these four" — `minItems`/`maxItems` are outside the subset it
 * accepts — so the set is checked here, the same way `readExactPieces` does it
 * for the notes of `repurpose`.
 */
export function readAxes(value: unknown): Axis[] | null {
	if (!Array.isArray(value)) return null;
	const seen = new Map<AxisId, Axis>();
	for (const entry of value) {
		if (!entry || typeof entry !== 'object') return null;
		const { id, pasa, motivo, cita } = entry as Record<string, unknown>;
		if (!AXES.includes(id as AxisId) || seen.has(id as AxisId)) return null;
		if (typeof pasa !== 'boolean') return null;
		const reason = text(motivo, MAX_MOTIVO);
		if (!reason) return null;
		seen.set(id as AxisId, { id: id as AxisId, pasa, motivo: reason, cita: text(cita, MAX_CITA) });
	}
	if (seen.size !== AXES.length) return null;
	return AXES.map((id) => seen.get(id)!);
}

export function readJudgment(raw: unknown): Judgment | null {
	if (!raw || typeof raw !== 'object') return null;
	const { tarea, tareaDeTrabajo, pasos, axes, forma, queHace, masCercano } = raw as Record<string, unknown>;
	const read = readAxes(axes);
	if (!read) return null;
	if (!SHAPES.includes(forma as Shape)) return null;
	const queHaceText = text(queHace, 400);
	if (!queHaceText) return null;
	const steps = Array.isArray(pasos)
		? pasos.filter((step): step is string => typeof step === 'string').map((step) => step.trim().slice(0, 300)).filter(Boolean).slice(0, 12)
		: [];
	return {
		tarea: text(tarea, 200),
		tareaDeTrabajo: tareaDeTrabajo === true,
		pasos: steps,
		axes: read,
		queHace: queHaceText,
		forma: forma as Shape,
		masCercano: text(masCercano, 400)
	};
}

/** Below this there is no procedure, whatever the page made the model feel. */
const MIN_STEPS = 2;

/**
 * A page is procedural when it enumerates the procedure, not when it is about
 * one.
 *
 * MEASURED, and this is why the rule exists: with only the axis and its quote to
 * defend, the judgment called Paul Graham on what to work on, a man's diary
 * habit and Notion's product page procedural — all four axes, all with quotes
 * that really were on the page. An essay hands you a way of thinking and the
 * model reads that as a method; a product page lists what the software does and
 * the model reads that as steps.
 *
 * Making it write the steps out first is what breaks that. It is the same move
 * as the `ancla` in `repurpose`: the claim has to name its material before it is
 * allowed to stand, and material that isn't there is hard to enumerate.
 */
export function enforceSteps(judgment: Judgment): Judgment {
	if (judgment.pasos.length >= MIN_STEPS) return judgment;
	return {
		...judgment,
		axes: judgment.axes.map((axis) =>
			axis.id === 'procedimental' && axis.pasa ? { ...axis, pasa: false, descartado: 'sin-pasos' as const } : axis
		)
	};
}

/**
 * An axis passes only if its quote is really on the page.
 *
 * This is the whole honesty of the tool. The model is being asked to justify
 * four claims about someone else's page and it has every incentive to be
 * agreeable; a claim whose evidence isn't there is downgraded to a fail, not
 * dropped and not trusted. It is the same lock the newsletter audit runs on its
 * open findings, and there it already caught a synthesis presented as evidence.
 *
 * `haystack` must arrive already normalized with `normalizeQuoteText`.
 *
 * Returns the ids whose quote failed, so the caller can log which ones and stop
 * flying blind when a page starts scoring lower than it should.
 */
export function verifyAxes(judgment: Judgment, haystack: string): { judgment: Judgment; unverified: AxisId[] } {
	const unverified: AxisId[] = [];
	const axes = judgment.axes.map((axis) => {
		if (!axis.pasa) return axis;
		if (verifyQuote(axis.cita, haystack)) return axis;
		unverified.push(axis.id);
		return { ...axis, pasa: false, descartado: 'sin-cita' as const };
	});
	return { judgment: { ...judgment, axes }, unverified };
}
