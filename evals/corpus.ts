/**
 * The twenty pages the judgment is measured against.
 *
 * Ten that obviously convert and ten that obviously don't. Obvious is the
 * point: this corpus is not here to explore the grey zone, it is here to catch
 * a judgment that has stopped working at all. Something that gets these wrong
 * cannot be trusted on the hard ones, and nothing gets built on top of it.
 *
 * RULES FOR ADDING ONE:
 *
 *  - Every URL was fetched and answered 200 with real text before it went in.
 *    A page that starts 403ing shows up in the run as unreadable, not as a
 *    wrong answer — replace it rather than letting it rot the count.
 *  - The label is about convertibility, NOT about the shape. Some convertible
 *    pages here are deliberately not generators (`forma`), because picking the
 *    wrong shape is the other way this fails and it deserves to be watched.
 *  - Spanish and English both, because the visitors write in Spanish and read
 *    in English, and a judgment that only works in one language is half a
 *    judgment.
 */
import type { Shape } from '$lib/tools/actionable/judgment';

export type Case = {
	url: string;
	/** Does this page carry something a person could use as a tool? */
	convertible: boolean;
	/** The shape it should be called, when there is one obvious answer. Informative, not asserted. */
	forma?: Shape;
	/** Why it is labelled that way — read this when a run disagrees. */
	nota: string;
};

export const corpus: Case[] = [
	// ─── Convierten ────────────────────────────────────────────────────────────
	{
		url: 'https://copyblogger.com/magnetic-headlines/',
		convertible: true,
		forma: 'generador',
		nota: 'Fórmulas de titular enumeradas, con su molde. Entra un tema, salen titulares.'
	},
	{
		url: 'https://www.orbitmedia.com/blog/writing-headlines/',
		convertible: true,
		forma: 'generador',
		nota: 'Tipos de titular con su mecanismo, repetibles sobre cualquier tema.'
	},
	{
		url: 'https://escueladecopywriting.com/formulas-copywriting/',
		convertible: true,
		forma: 'generador',
		nota: 'PAS, AIDA y compañía: moldes explícitos que se rellenan con lo tuyo. En español.'
	},
	{
		url: 'https://marjamorante.com/formulas-de-copywriting/',
		convertible: true,
		forma: 'generador',
		nota: 'Treinta y tantas fórmulas con su plantilla. El caso más claro que hay. En español.'
	},
	{
		url: 'https://josefacchin.com/formulas-de-copywriting/',
		convertible: true,
		forma: 'generador',
		nota: 'Cinco fórmulas con estructura y ejemplo de cada una. En español.'
	},
	{
		url: 'https://puzzleinbox.com/blog/cold-email-subject-line-formulas/',
		convertible: true,
		forma: 'generador',
		nota: 'Fórmulas de asunto con variables (empresa, dolor, métrica) que se rellenan.'
	},
	{
		url: 'https://blog.hootsuite.com/instagram-captions/',
		convertible: true,
		forma: 'generador',
		nota: 'Cómo escribir pies de foto por tipo de publicación. Se hace cada semana.'
	},
	{
		url: 'https://ahrefs.com/blog/how-to-write-a-blog-post/',
		convertible: true,
		nota: 'Proceso entero y ordenado. La forma es discutible (generador o lista con memoria); que convierte, no.'
	},
	{
		url: 'https://www.nngroup.com/articles/microcontent-how-to-write-headlines-page-titles-and-subject-lines/',
		convertible: true,
		nota: 'Criterios duros para juzgar un titular. Sale corrector con la misma facilidad que generador.'
	},
	{
		url: 'https://baremetrics.com/blog/saas-pricing-models',
		convertible: true,
		forma: 'calculadora',
		nota: 'Modelos de precio con su aritmética. Aquí llamarlo generador sería el error caro.'
	},

	// ─── No convierten ─────────────────────────────────────────────────────────
	{
		url: 'https://paulgraham.com/love.html',
		convertible: false,
		nota: 'Ensayo sobre a qué dedicar la vida. Ni pasos, ni entrada, ni repetición.'
	},
	{
		url: 'https://paulgraham.com/vb.html',
		convertible: false,
		nota: 'Ensayo corto sobre el tiempo. Bonito y completamente inejecutable.'
	},
	{
		url: 'https://waitbutwhy.com/2014/05/fermi-paradox.html',
		convertible: false,
		nota: 'Divulgación larguísima sobre la paradoja de Fermi. Sirve además para ver que un texto de 30.000 caracteres no se convierte por ser largo.'
	},
	/*
	 * Aquí estaba `sive.rs/dj`, etiquetada como "una anécdota con moraleja".
	 * Estaba mal etiquetada por mí, y el juicio tenía razón al llevarme la
	 * contraria: la página dice literalmente "here's what I do and recommend" y
	 * enumera diez reglas para llevar un diario. Es un caso gris, y este corpus
	 * es de casos obvios.
	 *
	 * Se cambia la etiqueta cuando la página no es lo que yo creía; NO se cambia
	 * cuando el juicio se equivoca. La diferencia entre las dos cosas es todo lo
	 * que separa medir de hacerse trampas al solitario.
	 */
	{
		url: 'https://waitbutwhy.com/2015/12/the-tail-end.html',
		convertible: false,
		nota: 'Ensayo con gráficos. Hace pensar; no hace nada dos veces.'
	},
	{
		url: 'https://en.wikipedia.org/wiki/Content_marketing',
		convertible: false,
		nota: 'Enciclopedia: define e historia. No dice cómo se hace nada.'
	},
	{
		url: 'https://blog.google/technology/ai/google-gemini-ai/',
		convertible: false,
		nota: 'Anuncio de producto. Noticia, no método.'
	},
	{
		url: 'https://apnews.com/hub/technology',
		convertible: false,
		nota: 'Portada de noticias. Ni siquiera es un texto: es una lista de titulares del día.'
	},
	{
		url: 'https://about.fb.com/news/',
		convertible: false,
		nota: 'Sala de prensa corporativa. El caso de "he pegado la portada y no el artículo".'
	},
	{
		url: 'https://www.notion.com/product',
		convertible: false,
		nota: 'Landing de producto. Promete resultados y no explica ningún procedimiento.'
	},
	{
		url: 'https://elpais.com/',
		convertible: false,
		nota: 'Una portada de periódico. Si esto pasa el filtro, el filtro no existe.'
	}
];
