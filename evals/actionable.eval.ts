/**
 * Measures the convertibility judgment against the twenty pages of `corpus.ts`.
 *
 * `pnpm eval:actionable`. It is NOT part of `pnpm test`: it costs money, needs
 * the network and takes minutes. That is also why it has its own config —
 * `vitest.eval.config.ts` — instead of a filename that `pnpm test` might one day
 * decide to pick up.
 *
 * THE DOWNLOADS ARE CACHED ON DISK (`evals/.cache`, gitignored). The first run
 * pays for twenty scrapes; every run after that only pays the model, so
 * re-reading the same twenty pages after touching the prompt is fast and the
 * corpus stops moving under you when a site redesigns. Delete the folder to
 * refresh it.
 *
 * THE NUMBER IS NOT THE POINT. It writes the whole judgment of every page to
 * `evals/.out/actionable.json` and prints each one's reasoning, because the
 * measure of this thing is whether the explanations are any good — a run that
 * sorts 20 out of 20 with reasons nobody would sign is a failure with a nice
 * score. Read the file.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { judgeSnapshot, readPage, type Snapshot } from '$lib/server/actionable';
import { corpus, type Case } from './corpus';

const CACHE = 'evals/.cache';
const OUT = 'evals/.out';
/** Four at a time: enough to keep the run short, far from anyone's rate limit. */
const CONCURRENCY = 4;

/**
 * How many times each page is judged. `EVAL_RUNS=3 pnpm eval:actionable`.
 *
 * IT EXISTS BECAUSE ONE PASS LIES. Two consecutive runs over the identical
 * twenty cached pages scored 19 and 17, disagreeing about different pages each
 * time: this API takes no temperature and the judgment is genuinely unstable on
 * the pages that sit near the line. A single score is a coin flip reported as a
 * measurement, and tuning a prompt against one is how you chase noise for an
 * afternoon.
 *
 * With more than one run a page counts as right when the MAJORITY of its runs
 * is right, and the ones that answered differently across runs are printed
 * apart — those are the ones worth reading, whatever the total says.
 */
const RUNS = Math.max(1, Number(process.env.EVAL_RUNS ?? 1));

function slug(url: string): string {
	return url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '').slice(0, 90);
}

async function snapshotFor(url: string): Promise<Snapshot> {
	const path = `${CACHE}/${slug(url)}.json`;
	if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
	const page = await readPage(url);
	mkdirSync(CACHE, { recursive: true });
	writeFileSync(path, JSON.stringify(page, null, '\t'));
	return page;
}

type Row = Case & {
	/** `null` when the page couldn't be read or the model gave nothing usable twice. */
	veredicto: string | null;
	forma_dicha?: string;
	acierta: boolean;
	tarea?: string;
	pasos?: string[];
	razones: string[];
	queHace?: string;
	masCercano?: string;
	fallo?: string;
};

/** `flojo` counts as a yes: offering the weak version to a page that shouldn't convert is the error we care about. */
const CONVERTS = new Set(['sirve', 'flojo', 'otra-forma']);

async function run(entry: Case): Promise<Row> {
	try {
		const page = await snapshotFor(entry.url);
		const judged = await judgeSnapshot(page, 'eval/actionable');
		if (!judged) return { ...entry, veredicto: null, acierta: false, razones: [], fallo: 'el modelo no devolvió un juicio legible' };
		return {
			...entry,
			veredicto: judged.verdict,
			forma_dicha: judged.judgment.forma,
			acierta: CONVERTS.has(judged.verdict) === entry.convertible,
			tarea: judged.judgment.tarea,
			pasos: judged.judgment.pasos,
			// The mark says who decided: `✕` is the model's own no, `↓` is us
			// overruling a yes it couldn't back. Without the distinction a bad
			// prompt and a working guard look identical in the output.
			razones: judged.judgment.axes.map(
				(axis) => `${axis.pasa ? '✓' : axis.descartado ? `↓${axis.descartado}` : '✕'} ${axis.id}: ${axis.motivo}`
			),
			queHace: judged.judgment.queHace,
			masCercano: judged.judgment.masCercano
		};
	} catch (error) {
		return { ...entry, veredicto: null, acierta: false, razones: [], fallo: error instanceof Error ? `${error.name}: ${error.message}` : 'fallo desconocido' };
	}
}

/** A small pool: `Promise.all` over twenty would hammer both the sites and the API. */
async function pool(jobs: (() => Promise<Row>)[]): Promise<Row[]> {
	const rows: Row[] = new Array(jobs.length);
	let next = 0;
	await Promise.all(
		Array.from({ length: CONCURRENCY }, async () => {
			while (next < jobs.length) {
				const index = next++;
				rows[index] = await jobs[index]();
			}
		})
	);
	return rows;
}

/**
 * The runs of one page, collapsed into one row.
 *
 * The kept row is the first one whose answer matches the majority, so the
 * reasoning printed belongs to the answer being reported and not to some other
 * pass that said something else.
 */
function collapse(runs: Row[]): Row & { veredictos: string[]; inestable: boolean } {
	const hits = runs.filter((row) => row.acierta).length;
	const majority = hits * 2 > runs.length;
	const veredictos = runs.map((row) => row.veredicto ?? 'ILEGIBLE');
	const chosen = runs.find((row) => row.acierta === majority) ?? runs[0];
	return { ...chosen, acierta: majority, veredictos, inestable: new Set(veredictos).size > 1 };
}

describe('el juicio de convertibilidad', () => {
	it(
		'ordena las veinte páginas del corpus',
		async () => {
			// Every run of every page in one pool, so three passes cost the wall
			// clock of one and a bit rather than three.
			const flat = await pool(corpus.flatMap((entry) => Array.from({ length: RUNS }, () => () => run(entry))));
			const rows = corpus.map((_, index) => collapse(flat.slice(index * RUNS, index * RUNS + RUNS)));

			mkdirSync(OUT, { recursive: true });
			writeFileSync(`${OUT}/actionable.json`, JSON.stringify(rows, null, '\t'));

			const hits = rows.filter((row) => row.acierta).length;
			const lines = rows.map((row) => {
				const mark = row.acierta ? '  ' : '!!';
				const said = RUNS > 1 ? row.veredictos.join(', ') : (row.veredicto ?? `ILEGIBLE (${row.fallo})`);
				return `${mark} ${row.convertible ? 'convierte  ' : 'no convierte'} → ${said.padEnd(11)} ${row.forma_dicha ?? ''}\t${row.url}`;
			});

			const unstable = rows.filter((row) => row.inestable);

			// Only the misses are expanded here. The rest is in the JSON, which is
			// what you actually read.
			const misses = rows
				.filter((row) => !row.acierta)
				.map((row) => `\n${row.url}\n  esperado: ${row.convertible ? 'convierte' : 'no convierte'} — ${row.nota}\n  dicho: ${row.veredicto ?? row.fallo}\n  ${row.razones.join('\n  ')}`);

			console.log(
				[
					`\n${hits}/${rows.length} bien clasificadas${RUNS > 1 ? ` (por mayoría de ${RUNS} pasadas)` : ''}`,
					...lines,
					unstable.length
						? `\n${unstable.length} páginas cambian de respuesta entre pasadas:\n${unstable.map((row) => `  ${row.veredictos.join(' / ')}\t${row.url}`).join('\n')}`
						: '',
					misses.length ? `\n─── las que fallan ───${misses.join('\n')}` : '',
					`\nel juicio entero de las veinte: ${OUT}/actionable.json`
				].join('\n')
			);

			// Nothing gets built on top of a judgment that can't sort the obvious
			// ones. Eighteen leaves room for the two whose shape is genuinely
			// arguable; it does not leave room for a portada passing.
			expect(hits).toBeGreaterThanOrEqual(18);
		},
		15 * 60 * 1000
	);
});
