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

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const source = join(here, 'damiansoto');
const target = join(root, 'static', 'damiansoto-skill.zip');

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

const files = await walk(source);
if (!files.length) {
	console.error('No hay nada en skill/damiansoto/.');
	process.exit(1);
}

const entries = [];
for (const file of files) {
	entries.push({
		// La carpeta de dentro se llama como el skill: al descomprimir cae
		// entera en ~/.claude/skills/ y no hay que renombrar nada.
		name: `damiansoto/${file.name}`,
		content: await readFile(file.full, 'utf8')
	});
}

const bytes = await zip(entries, new Date());
await writeFile(target, bytes);

console.log(`${relative(root, target)} — ${entries.length} ficheros, ${(bytes.length / 1024).toFixed(1)} KB`);
for (const entry of entries) console.log(`  ${entry.name}`);
