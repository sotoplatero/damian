/**
 * The generated tool, as data.
 *
 * A TOOL HERE IS A SPEC, NOT CODE. The obvious alternative — have the model
 * write a page and serve it — means storing and running somebody else's markup
 * on our domain, and it buys nothing a form and a prompt don't already do. A
 * spec is a form (`campos`), a procedure in our own words (`reglas`) and a shape
 * of answer (`cuantos`, `variedad`). One generic page paints it and one endpoint
 * runs it.
 *
 * It also makes the brief's quality bar checkable instead of aspirational: every
 * field declares what it changes (`cambia`), and a field nobody can say that
 * about is a decorative field the visitor can delete before building.
 *
 * Everything in this module is pure and tested. Signing and links live in
 * `$lib/server/actionable-link.ts`, because those need a secret.
 */

export const FIELD_TYPES = ['texto', 'parrafo', 'opcion'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export type Field = {
	/** Key used in the form and in the prompt. Slug, ours, never the model's free text. */
	id: string;
	etiqueta: string;
	/** Placeholder. What a real answer looks like, not a repetition of the label. */
	ayuda: string;
	tipo: FieldType;
	/** Only for `opcion`. Two to six; anything else is a text field pretending. */
	opciones: string[];
	/** What changes in the answer when this changes. Shown in the plan so a decorative field is visible. */
	cambia: string;
};

export type Spec = {
	nombre: string;
	/** One plain sentence: what it asks for and what it gives back. */
	queHace: string;
	campos: Field[];
	/** The procedure, in our words. Never the source's sentences — see `copiesSource`. */
	reglas: string[];
	cuantos: number;
	/** How the results differ from each other. Without it a generator returns the same thing N times. */
	variedad: string;
	fuente: { url: string; titulo: string };
};

/** Two is a form; five is a questionnaire nobody finishes. */
export const MIN_FIELDS = 2;
export const MAX_FIELDS = 4;
const MIN_RULES = 2;
const MAX_RULES = 10;
const MIN_RESULTS = 3;
const MAX_RESULTS = 10;

function text(value: unknown, max: number): string {
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function texts(value: unknown, count: number, max: number): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim().slice(0, max)).filter(Boolean).slice(0, count)
		: [];
}

/**
 * The id is ours, derived from the label.
 *
 * The model's own ids arrive as `Tema del post`, `tema_del_post` or `field1`
 * depending on the day, and they end up as object keys and form names. Deriving
 * them here means the prompt never has to be trusted with something structural.
 *
 * **CHANGING THIS FUNCTION CHANGES THE IDS OF TOOLS ALREADY SHARED.** The link
 * carries the spec, and the spec is re-read — ids included — on every request,
 * so a new slug rule silently renames the fields of every tool anyone is
 * holding. The signature still checks out; the form just stops matching, and
 * `readAnswers` answers `incomplete_form` for a form the visitor filled in
 * completely. Measured the moment the trailing-dash trim moved one line.
 */
export function toFieldId(label: string, index: number): string {
	const slug = label
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		// Trimmed AFTER the cut, not before: slicing a long label lands
		// mid-word and leaves `articulo-o-texto-de-apoy-` hanging.
		.slice(0, 24)
		.replace(/^-+|-+$/g, '');
	return slug || `campo-${index + 1}`;
}

function readField(raw: unknown, index: number): Field | null {
	if (!raw || typeof raw !== 'object') return null;
	const { etiqueta, ayuda, tipo, opciones, cambia } = raw as Record<string, unknown>;
	const label = text(etiqueta, 60);
	const changes = text(cambia, 200);
	if (!label || !changes) return null;
	const kind = FIELD_TYPES.includes(tipo as FieldType) ? (tipo as FieldType) : 'texto';
	const choices = kind === 'opcion' ? texts(opciones, 6, 40) : [];
	// A dropdown with one option is not a choice, it is a decoration that also
	// lies about being one. Demote it rather than reject the whole spec.
	const settled: FieldType = kind === 'opcion' && choices.length < 2 ? 'texto' : kind;
	return {
		id: toFieldId(label, index),
		etiqueta: label,
		ayuda: text(ayuda, 100),
		tipo: settled,
		opciones: settled === 'opcion' ? choices : [],
		cambia: changes
	};
}

/**
 * Reads a spec from loose JSON — the model's, or the visitor's after editing.
 *
 * The SAME function reads both, on purpose. What comes back from the browser at
 * build time is a spec the visitor has been editing, which means it is untrusted
 * input that happens to look familiar; giving it a softer door than the model's
 * is how a signed link ends up carrying whatever somebody typed.
 */
export function readSpec(raw: unknown): Spec | null {
	if (!raw || typeof raw !== 'object') return null;
	const { nombre, queHace, campos, reglas, cuantos, variedad, fuente } = raw as Record<string, unknown>;
	const name = text(nombre, 80);
	const does = text(queHace, 300);
	if (!name || !does) return null;

	const fields = (Array.isArray(campos) ? campos : [])
		.slice(0, MAX_FIELDS)
		.map((field, index) => readField(field, index))
		.filter((field): field is Field => field !== null);
	if (fields.length < MIN_FIELDS) return null;
	// Two fields with the same label collapse to the same id and the second
	// silently overwrites the first in the answers object.
	if (new Set(fields.map((field) => field.id)).size !== fields.length) return null;

	const rules = texts(reglas, MAX_RULES, 300);
	if (rules.length < MIN_RULES) return null;

	const source = fuente && typeof fuente === 'object' ? (fuente as Record<string, unknown>) : {};
	const url = text(source.url, 500);
	if (!url) return null;

	const count = Math.round(Number(cuantos));
	return {
		nombre: name,
		queHace: does,
		campos: fields,
		reglas: rules,
		cuantos: Number.isFinite(count) ? Math.min(MAX_RESULTS, Math.max(MIN_RESULTS, count)) : 5,
		variedad: text(variedad, 300),
		fuente: { url, titulo: text(source.titulo, 200) }
	};
}

/** Words, lowercased and stripped of accents and punctuation, for comparing runs of text. */
function words(input: string): string[] {
	return input
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter(Boolean);
}

/** Long enough that hitting it by accident takes real bad luck, short enough to catch a lifted sentence. */
const RUN = 8;

/**
 * Does the spec carry the source's actual sentences?
 *
 * The one constraint the brief asks to build in rather than retrofit: a
 * procedure belongs to nobody, somebody's sentences don't. Eight consecutive
 * words shared with the article is not a coincidence, it is a paste.
 *
 * It also happens to produce better tools, which is the real reason it works:
 * a model that cannot copy has to have understood.
 *
 * Returns the offending fragment so the retry can name it.
 */
export function copiesSource(spec: Spec, articleText: string): string | null {
	const haystack = words(articleText);
	if (haystack.length < RUN) return null;
	const seen = new Set<string>();
	for (let index = 0; index + RUN <= haystack.length; index += 1) {
		seen.add(haystack.slice(index, index + RUN).join(' '));
	}

	const mine = [spec.queHace, spec.variedad, ...spec.reglas, ...spec.campos.map((field) => `${field.etiqueta} ${field.ayuda} ${field.cambia}`)];
	for (const piece of mine) {
		const run = words(piece);
		for (let index = 0; index + RUN <= run.length; index += 1) {
			const shingle = run.slice(index, index + RUN).join(' ');
			if (seen.has(shingle)) return shingle;
		}
	}
	return null;
}

/** The answers the visitor typed, keyed by field id. */
export type Answers = Record<string, string>;

/**
 * Reads the form, dropping anything the spec didn't ask for.
 *
 * `null` when a field came back empty: the brief's bar is that every input
 * changes the output, and a tool that runs with half its form blank is a tool
 * whose fields were decorative after all.
 */
export function readAnswers(spec: Spec, raw: unknown): Answers | null {
	if (!raw || typeof raw !== 'object') return null;
	const source = raw as Record<string, unknown>;
	const answers: Answers = {};
	for (const field of spec.campos) {
		const value = text(source[field.id], 600);
		if (!value) return null;
		if (field.tipo === 'opcion' && !field.opciones.includes(value)) return null;
		answers[field.id] = value;
	}
	return answers;
}

/** The form, as the model sees it when the tool runs. */
export function answersMessage(spec: Spec, answers: Answers): string {
	const lines = spec.campos.map((field) => `${field.etiqueta}: ${answers[field.id]}`);
	return `Lo que ha puesto la persona:\n${lines.join('\n')}`;
}
