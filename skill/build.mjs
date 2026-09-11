#!/usr/bin/env node
/**
 * Comprime `skill/damiansoto/` en `static/damiansoto-skill.zip`.
 *
 *   node --experimental-strip-types skill/build.mjs
 *
 * El flag hace falta porque esto importa `src/lib/tools/archive/zip.ts`, que es
 * TypeScript. Y lo importa en vez de traerse otro escritor de zip porque ese ya
 * existe, ya está probado —su test lee los bytes de vuelta y los infla con
 * `node:zlib`, una segunda implementación comprobando a la primera— y dos
 * escritores de zip en un repositorio son dos cosas que mantener para lo mismo.
 *
 * El zip NO lleva versión en el nombre, igual que `cervantes.zip`: un enlace
 * mandado por correo hace meses tiene que seguir dando el último.
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const source = join(here, 'damiansoto');
const target = join(root, 'static', 'damiansoto-skill.zip');

/**
 * El índice que hace que `npx skills add https://damiansoto.me/skill` funcione.
 *
 * El CLI de `skills` (vercel-labs/skills) descubre por `.well-known` ANTES de
 * plantearse descargar la URL, así que `/skill` puede seguir siendo la página
 * HTML para personas: el CLI nunca llega a pedirla.
 *
 * **SE ESCRIBE DOS VECES, Y NO ES POR SI ACASO.** Medido contra el CLI de
 * verdad: con una URL que lleva ruta, si no encuentra el índice bajo esa ruta
 * NO cae al de la raíz, y lo dice con todas las letras —«Not falling back to
 * the root skills index because that would install every skill the host
 * publishes»—. Así que:
 *
 *   static/skill/.well-known/... → `skills add https://damiansoto.me/skill`
 *   static/.well-known/...       → `skills add https://damiansoto.me` a secas
 *
 * **El `digest` es sha256 del zip y el CLI lo comprueba**, así que esto se
 * regenera aquí y no se escribe a mano: un zip nuevo con el digest viejo hace
 * fallar la instalación de todo el mundo.
 */
const INDEXES = [
	join(root, 'static', '.well-known', 'agent-skills', 'index.json'),
	join(root, 'static', 'skill', '.well-known', 'agent-skills', 'index.json')
];
const SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';

const { zip } = await import(pathToFileURL(join(root, 'src/lib/tools/archive/zip.ts')).href);

/** Todos los ficheros de una carpeta, con su ruta relativa, en orden estable. */
async function walk(dir, base = dir) {
	const found = [];
	for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
		a.name.localeCompare(b.name)
	)) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) found.push(...(await walk(full, base)));
		else found.push({ name: relative(base, full).split('\\').join('/'), full });
	}
	return found;
}

function fail(message) {
	console.error(`
${message}
`);
	process.exit(1);
}

const files = await walk(source);
if (!files.length) fail('No hay nada en skill/damiansoto/.');

const entries = [];
for (const file of files) {
	entries.push({
		// EL ZIP VA PLANO: SKILL.md en la raíz, no dentro de una carpeta. Lo exige
		// el CLI de `skills`, que después de comprobar el digest hace
		// `files.get("SKILL.md")` sobre el archivo extraído y devuelve null si no
		// está ahí. Con todo metido en `damiansoto/` la instalación fallaba con un
		// «No matching skills» que no dice nada de esto.
		//
		// La contrapartida es que descomprimirlo a mano necesita carpeta de
		// destino: `unzip -d ~/.claude/skills/damiansoto`. La página lo dice.
		name: file.name,
		content: await readFile(file.full, 'utf8')
	});
}

const bytes = await zip(entries, new Date());
await writeFile(target, bytes);

/**
 * El nombre y la descripción salen del propio SKILL.md: son los que el CLI
 * enseña al instalar, y tenerlos en dos sitios es tenerlos distintos. El nombre
 * tiene que casar con `^[a-z0-9-]+$` y la descripción no puede pasar de 1024
 * caracteres, que es lo que el CLI valida antes de aceptar la entrada.
 */
// Con `\r` sin quitar, el `^---\n` no casa y en Windows el frontmatter parece no existir.
const head = (await readFile(join(source, 'SKILL.md'), 'utf8')).replace(/\r/g, '');
const front = head.match(/^---\n([\s\S]*?)\n---/);
if (!front) fail('SKILL.md no tiene frontmatter.');
const field = (key) => {
	const match = front[1].match(new RegExp(`^${key}:\\s*([\\s\\S]*?)(?=\\n[a-z-]+:|$)`, 'm'));
	return match ? match[1].replace(/\s+/g, ' ').trim() : '';
};
const name = field('name');
const description = field('description');
if (!/^[a-z0-9-]+$/.test(name)) fail(`El nombre "${name}" no le vale al CLI: solo minúsculas, dígitos y guiones.`);
if (!description) fail('SKILL.md no tiene description.');
if (description.length > 1024) fail(`La descripción tiene ${description.length} caracteres y el tope son 1024.`);

const index =
	JSON.stringify(
		{
			$schema: SCHEMA,
			skills: [
				{
					name,
					description,
					type: 'archive',
					// Absoluta desde el host, para que valga igual desde los dos sitios.
					url: `/${relative(join(root, 'static'), target).split('\\').join('/')}`,
					digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`
				}
			]
		},
		null,
		2
	) + '\n';

for (const path of INDEXES) {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, index, 'utf8');
}

console.log(`${relative(root, target)} — ${entries.length} ficheros, ${(bytes.length / 1024).toFixed(1)} KB`);
for (const entry of entries) console.log(`  ${entry.name}`);
for (const path of INDEXES) console.log(`${relative(root, path)} — ${name}`);
