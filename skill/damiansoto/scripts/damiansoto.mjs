#!/usr/bin/env node
/**
 * El cliente de las herramientas de damiansoto.me.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ESTE SKILL NO ESCRIBE NADA. LLAMA AL SITIO.
 *
 * Los prompts, las reglas de voz, los nueve formatos de nota y los diez tipos de
 * post viven en el servidor y no se copian aquí. Eso tiene tres consecuencias
 * que conviene tener presentes:
 *
 *   1. Lo que sale es exactamente lo que sale en la web, siempre. No hay dos
 *      versiones que puedan separarse.
 *   2. La mitad de pago LLEGA AL CORREO, no a la terminal: el paso `unlock`
 *      devuelve `{ok:true}` y nada más. Así funciona la web y así se queda.
 *   3. Dar el correo da de alta esa dirección en la lista. Hay que decirlo
 *      ANTES de pedirlo, no después, cuando ya no sirve de nada saberlo.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   node damiansoto.mjs repartir  <url>              → las cinco notas gratis
 *   node damiansoto.mjs repartir  --email <correo>   → las otras cuatro, al correo
 *   node damiansoto.mjs posts     "<tu idea>"        → el primer post
 *   node damiansoto.mjs posts     --email <correo>   → los otros nueve, al correo
 *   node damiansoto.mjs acercade  <publicacion>      → diagnóstico y primer criterio
 *   node damiansoto.mjs acercade  --email <correo>   → el informe entero, al correo
 *
 * El paso gratis guarda su respuesta en un fichero temporal porque el de pago
 * tiene que devolverla entera al servidor —el análisis y las notas gratis van en
 * el cuerpo del `unlock`— y reconstruir ese JSON a mano es la manera más fácil
 * de que la entrega falle con `incomplete_article`.
 *
 * Sin dependencias. Node 18 o más nuevo.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** El sitio. `DAMIANSOTO_URL` lo cambia, que es como se prueba contra local. */
const SITE = (process.env.DAMIANSOTO_URL || 'https://damiansoto.me').replace(/\/$/, '');

const STATE_DIR = join(tmpdir(), 'damiansoto-skill');

/**
 * Los códigos de error del servidor, dichos en castellano.
 *
 * Son los mismos que `src/lib/tools/client.ts` mapea para las páginas. Un código
 * que no esté aquí cae en el genérico: es preferible a inventarse una
 * explicación de algo que no se sabe.
 */
const ERRORS = {
	unreadable: 'No he podido leer esa página.',
	invalid_url: 'Esa dirección no vale.',
	idea_short: 'La idea es demasiado corta. Escribe al menos veinte caracteres.',
	invalid_email: 'Ese correo no parece válido.',
	incomplete_article: 'Al servidor le faltaba parte del artículo. Vuelve a empezar por el paso gratis.',
	incomplete_topic: 'Al servidor le faltaba el tema. Vuelve a empezar por el paso gratis.',
	disposable: 'Eso es un buzón de usar y tirar. Hace falta uno de verdad.',
	send_failed: 'No se ha podido enviar el correo.',
	rate_limit: 'Se ha alcanzado el límite por ahora. Espera un rato.',
	already_used: 'Esa dirección ya gastó su descarga.',
	server_error: 'El servidor ha fallado.',
	bad_request: 'La petición no tenía la forma esperada.'
};

const REASONS = {
	blocked: 'La página no deja que la lean.',
	not_found: 'Ahí no hay nada.',
	timeout: 'La página ha tardado demasiado.',
	empty: 'No se ha sacado nada aprovechable de esa página.',
	invalid_url: 'Esa dirección no vale.'
};

function fail(message) {
	console.error(`\n${message}\n`);
	process.exit(1);
}

async function post(path, payload) {
	let response;
	try {
		response = await fetch(`${SITE}${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
			// Los pasos de pago llaman al modelo dos veces en el peor caso.
			signal: AbortSignal.timeout(180_000)
		});
	} catch (error) {
		fail(
			error?.name === 'TimeoutError'
				? `${SITE} ha tardado demasiado en contestar.`
				: `No he podido conectar con ${SITE}.`
		);
	}

	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		const detail = data.error === 'unreadable' ? REASONS[data.reason] : null;
		fail(detail || ERRORS[data.error] || `El sitio ha contestado ${response.status}.`);
	}
	return data;
}

async function saveState(tool, data) {
	await mkdir(STATE_DIR, { recursive: true });
	await writeFile(join(STATE_DIR, `${tool}.json`), JSON.stringify(data), 'utf8');
}

async function loadState(tool) {
	try {
		return JSON.parse(await readFile(join(STATE_DIR, `${tool}.json`), 'utf8'));
	} catch {
		fail('No hay ningún paso gratis guardado. Haz primero el paso sin correo.');
	}
}

const out = (value) => console.log(JSON.stringify(value, null, 2));

/** El aviso que acompaña siempre a la entrega. No se quita. */
const SENT =
	'Enviado. La otra mitad va al correo, no sale por aquí: así funciona la web y así se queda. ' +
	'Esa dirección queda dada de alta en la lista de Objeto Brillante; te borras en un clic desde cualquier envío.';

const TOOLS = {
	repartir: {
		path: '/tool/repurpose',
		free: (arg) => ({ step: 'extract', url: arg }),
		unlock: (state, email) => ({
			step: 'unlock',
			article: state.article,
			url: state.url,
			free: state.pieces,
			email
		})
	},
	posts: {
		path: '/tool/10-post-types',
		free: (arg) => ({ step: 'extract', idea: arg }),
		unlock: (state, email) => ({ step: 'unlock', topic: state.topic, free: state.posts, email })
	},
	acercade: {
		path: '/tool/substack-about/api',
		free: (arg) => ({ step: 'analyze', url: arg }),
		// El único cuyo paso de pago no reenvía nada: el servidor se guarda la
		// auditoría en su caché y le basta la URL.
		unlock: (state, email) => ({ step: 'unlock', url: state.url, email })
	}
};

const [name, ...rest] = process.argv.slice(2);
const tool = TOOLS[name];
if (!tool) {
	fail('Uso: node damiansoto.mjs <repartir|posts|acercade> <entrada | --email correo>');
}

const emailAt = rest.indexOf('--email');

if (emailAt !== -1) {
	const email = rest[emailAt + 1];
	if (!email) fail('Falta el correo después de --email.');
	const state = await loadState(name);
	await post(tool.path, tool.unlock(state, email));
	console.log(SENT);
} else {
	const input = rest.join(' ').trim();
	if (!input) fail('Falta la entrada: una URL, una idea o una publicación.');
	const data = await post(tool.path, tool.free(input));
	// `acercade` no devuelve la URL final y su `unlock` la necesita.
	await saveState(name, { ...data, url: data.url ?? input });
	out(data);
}
