/**
 * The convertibility judgment, end to end.
 *
 * It lives here and not in the endpoint so that the evaluation harness runs the
 * SAME code the visitor runs. An eval that goes through its own copy of the
 * prompt measures the copy, and the day the two drift is the day the twenty
 * URLs stop meaning anything.
 *
 * The split in two — read the page, then judge the snapshot — is what lets the
 * harness cache the downloads on disk and re-run the judgment for free.
 */
import { askJson } from '$lib/server/openai';
import { scrape } from '$lib/server/scrape';
import { normalizeQuoteText } from '$lib/tools/quotes';
import { judgePrompt, judgeSchema, pageMessage } from '$lib/tools/actionable/prompt';
import { planMessage, planPrompt, planSchema } from '$lib/tools/actionable/plan-prompt';
import { readResults, runMessage, runPrompt, runSchema, type Result } from '$lib/tools/actionable/run-prompt';
import { copiesSource, readSpec, type Answers, type Spec } from '$lib/tools/actionable/spec';
import { enforceSteps, readJudgment, verdictFor, verifyAxes, type AxisId, type Judgment, type Verdict } from '$lib/tools/actionable/judgment';

const MODEL = 'gpt-5.4-mini';

/**
 * Three times the site default, and it was measured, not guessed.
 *
 * Whether the rules of a procedure are all there is a question about the END of
 * the text, and a how-to worth converting runs long. At 12.000 the judgment was
 * answering "no está el procedimiento entero" for pages that had it — the
 * article was simply cut off. Being wrong here is invisible: it judges half a
 * page and reports with total confidence.
 */
const MAX_CHARS = 18_000;

export type Snapshot = { finalUrl: string; title: string; description: string; text: string };

export type Judged = {
	judgment: Judgment;
	verdict: Verdict;
	/** Axes whose quote wasn't on the page. Logged, never shown: it is our problem, not the visitor's. */
	unverified: AxisId[];
};

export function readPage(url: string): Promise<Snapshot> {
	return scrape(url, { maxChars: MAX_CHARS });
}

/**
 * Draws up the plan: the form, the rules and what comes back.
 *
 * Two attempts, and the only thing that earns a second one is carrying the
 * source's sentences. That check can't be asked for politely — the model has no
 * way to know what counts as eight consecutive words — so the correction names
 * the fragment it lifted and it tries again.
 */
export async function planFor(page: Snapshot, judgment: Judgment, tag = 'tool/actionable'): Promise<Spec | null> {
	let copied = '';
	for (let attempt = 1; attempt <= 2; attempt += 1) {
		const correction = copied
			? `\n\nCORRECCIÓN OBLIGATORIA: has copiado literalmente del artículo el fragmento «${copied}». Reescribe esa regla con tus palabras y revisa que no quede ni una frase del original.`
			: '';
		const raw = await askJson({
			model: MODEL,
			instructions: planPrompt() + correction,
			input: planMessage(judgment, page),
			schema: planSchema(),
			maxOutputTokens: 4000,
			tag
		});
		const spec = readSpec({ ...(raw as Record<string, unknown>), fuente: { url: page.finalUrl, titulo: page.title } });
		if (!spec) {
			console.warn(`[${tag}] plan ilegible en el intento ${attempt}`);
			continue;
		}
		copied = copiesSource(spec, page.text) ?? '';
		if (!copied) return spec;
		console.warn(`[${tag}] el plan copiaba del original: «${copied}»`);
	}
	return null;
}

/** Runs a generated tool. `null` when the model gave back the wrong number of results twice. */
export async function runTool(spec: Spec, answers: Answers, tag = 'tool/actionable/run'): Promise<Result[] | null> {
	for (let attempt = 1; attempt <= 2; attempt += 1) {
		const raw = await askJson({
			model: MODEL,
			instructions: runPrompt(),
			input: runMessage(spec, answers),
			schema: runSchema(),
			maxOutputTokens: 5000,
			tag
		});
		const results = readResults(raw, spec.cuantos);
		if (results) return results;
		console.warn(`[${tag}] resultados inservibles en el intento ${attempt}`);
	}
	return null;
}

/**
 * Judges a page already downloaded. `null` when the model gave nothing usable
 * twice — which is a failure, not a refusal: telling somebody their page doesn't
 * convert because our JSON came back malformed is the one lie this tool can't
 * afford.
 */
export async function judgeSnapshot(page: Snapshot, tag = 'tool/actionable'): Promise<Judged | null> {
	const haystack = normalizeQuoteText(`${page.title}\n${page.description}\n${page.text}`);

	for (let attempt = 1; attempt <= 2; attempt += 1) {
		const raw = await askJson({
			model: MODEL,
			instructions: judgePrompt(),
			input: pageMessage(page),
			schema: judgeSchema(),
			maxOutputTokens: 4000,
			tag
		});
		const parsed = readJudgment(raw);
		if (!parsed) {
			console.warn(`[${tag}] juicio ilegible en el intento ${attempt}`);
			continue;
		}
		const { judgment, unverified } = verifyAxes(enforceSteps(parsed), haystack);
		if (unverified.length) console.warn(`[${tag}] citas que no están en la página:`, unverified.join(', '));
		return { judgment, verdict: verdictFor(judgment), unverified };
	}
	return null;
}
