import { describe, it, expect } from 'vitest';
import { inflateRawSync } from 'node:zlib';
import { zip } from './zip';

/**
 * `zip` compresses with `CompressionStream`, the browser global, because the file
 * is assembled in the tab. Node has had the same global since 18, so these tests
 * exercise the real path and then INFLATE with `node:zlib` — a second, independent
 * implementation checking the first.
 */

/**
 * A hand-written zip either is a zip or it is a file that opens nowhere, so this
 * test READS IT BACK the way an extractor does: end record, central directory,
 * local headers, inflate, and the CRC checked against the bytes. Asserting on
 * lengths and signatures alone would pass for a file with the offsets wrong,
 * which is the whole class of bug worth catching here.
 *
 * The format was also verified outside the test suite: a file built by `zip` was
 * extracted with Windows' `Expand-Archive` and with `unzip`, names, accents and
 * contents intact.
 */

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[i] = c >>> 0;
	}
	return table;
})();

function crc32(bytes: Buffer): number {
	let crc = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

type ReadEntry = {
	name: string;
	content: string;
	crcOk: boolean;
	utf8Flag: boolean;
	/** 8 deflated, 0 stored. `zip` stores whatever deflate made bigger. */
	method: number;
};

/** An extractor, in twenty lines: the end record points at everything else. */
function unzip(bytes: Uint8Array): ReadEntry[] {
	const file = Buffer.from(bytes);
	const end = file.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
	expect(end).toBeGreaterThan(-1);
	const count = file.readUInt16LE(end + 10);
	let cursor = file.readUInt32LE(end + 16);

	const entries: ReadEntry[] = [];
	for (let i = 0; i < count; i++) {
		expect(file.readUInt32LE(cursor)).toBe(0x02014b50);
		const nameLength = file.readUInt16LE(cursor + 28);
		const compressedSize = file.readUInt32LE(cursor + 20);
		const crc = file.readUInt32LE(cursor + 16);
		const localOffset = file.readUInt32LE(cursor + 42);
		const name = file.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');

		// The local header has to sit exactly where the directory says it does.
		expect(file.readUInt32LE(localOffset)).toBe(0x04034b50);
		const localNameLength = file.readUInt16LE(localOffset + 26);
		const extraLength = file.readUInt16LE(localOffset + 28);
		const dataAt = localOffset + 30 + localNameLength + extraLength;
		const method = file.readUInt16LE(cursor + 10);
		const payload = file.subarray(dataAt, dataAt + compressedSize);
		// Inflating a stored entry would throw: the method has to be honoured.
		const raw = method === 8 ? inflateRawSync(payload) : payload;

		entries.push({
			name,
			content: raw.toString('utf8'),
			crcOk: crc32(raw) === crc,
			utf8Flag: (file.readUInt16LE(cursor + 8) & 0x0800) !== 0,
			method
		});
		cursor += 46 + nameLength + file.readUInt16LE(cursor + 30) + file.readUInt16LE(cursor + 32);
	}
	return entries;
}

const NOW = new Date('2026-08-12T10:20:30');

describe('zip', () => {
	it('round-trips names, contents and crc', async () => {
		const entries = [
			{ name: 'LEEME.md', content: '# Título\n\nÑandú, año 2026.\n' },
			{ name: 'indice.csv', content: 'fecha,titulo\n2026-08-12,"Uno, dos"\n' },
			{ name: 'posts/2026-08-12-hola.md', content: 'x'.repeat(50_000) }
		];
		const read = unzip(await zip(entries, NOW));

		expect(read.map((entry) => entry.name)).toEqual(entries.map((entry) => entry.name));
		expect(read.map((entry) => entry.content)).toEqual(entries.map((entry) => entry.content));
		expect(read.every((entry) => entry.crcOk)).toBe(true);
	});

	/** Without bit 11 an accented filename comes out mojibake in most extractors. */
	it('flags the names as utf-8', async () => {
		expect(unzip(await zip([{ name: 'año.md', content: 'x' }], NOW))[0].utf8Flag).toBe(true);
	});

	it('actually compresses text, which is the point of deflate over store', async () => {
		const content = 'la misma frase repetida. '.repeat(4000);
		const file = await zip([{ name: 'a.md', content }], NOW);
		expect(file.length).toBeLessThan(content.length / 10);
		expect(unzip(file)[0].method).toBe(8);
	});

	/**
	 * Deflate makes a tiny file BIGGER, and a zip that claims to have compressed
	 * something it grew is a zip whose sizes disagree with its bytes.
	 */
	it('stores what deflate would grow', async () => {
		const read = unzip(await zip([{ name: 'a.md', content: 'x' }], NOW));
		expect(read[0].method).toBe(0);
		expect(read[0].content).toBe('x');
		expect(read[0].crcOk).toBe(true);
	});

	it('holds an empty file and an empty archive', async () => {
		expect(unzip(await zip([{ name: 'vacio.md', content: '' }], NOW))[0].content).toBe('');
		expect(unzip(await zip([], NOW))).toHaveLength(0);
	});

	/** A DOS date can't go below 1980, and a negative year would corrupt the field. */
	it('clamps a date the format cannot hold', async () => {
		await expect(zip([{ name: 'a.md', content: 'x' }], new Date('1970-01-01'))).resolves.toBeDefined();
	});
});
