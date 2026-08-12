/**
 * A ZIP writer that runs in the browser, which is where the export is assembled.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY IT LIVES HERE AND NOT IN `$lib/server`
 *
 * The bodies arrive one batch per request, and the thing that survives across
 * those requests is the TAB, not the server: there is no store in this project
 * and no cron to drive one. So the browser accumulates the posts and builds the
 * file, and the server only ever hands over one batch of markdown at a time.
 *
 * That also means this can't use `node:zlib` or `Buffer`, which the first version
 * did. `CompressionStream('deflate-raw')` is the same compressor in both places —
 * a browser global since Chrome 80 / Firefox 113 / Safari 16.4, and a Node global
 * since 18 — so one implementation serves the browser and the tests. When it is
 * missing, entries are STORED uncompressed rather than not written: a bigger file
 * still opens.
 *
 * WHY IT IS HAND-WRITTEN
 *
 * The format needed here is four record types: local header, deflated bytes,
 * central directory, end record. No encryption, no zip64, no reading. A library
 * for that is a few hundred kilobytes in a bundle with five dependencies.
 *
 * WHAT IT DELIBERATELY DOESN'T DO
 *
 *  - **No zip64.** Above 4 GB, or 65535 entries, the 32-bit offsets in the central
 *    directory stop fitting and the file would be silently wrong. Nothing here can
 *    reach either number, but silently wrong is the one outcome worth refusing, so
 *    it throws.
 *  - **No directory entries.** A name with a slash in it (`posts/x.md`) is all any
 *    extractor needs to make the folder.
 *
 * VERIFIED, not assumed: files built by this were extracted with Windows'
 * `Expand-Archive` and with `unzip`, names, accents and contents intact.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type ZipEntry = {
	/** Path inside the zip. Forward slashes; no leading slash. */
	name: string;
	content: string;
};

/** Above these the offsets stop fitting in the 32-bit fields. See the header. */
const MAX_ENTRIES = 65_535;
const MAX_BYTES = 0xffffffff;

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[i] = c >>> 0;
	}
	return table;
})();

function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

/**
 * The MS-DOS date and time pair the format still uses: seconds have two-second
 * resolution and the year starts at 1980. An earlier date can't be represented,
 * so it clamps rather than writing a negative year.
 */
function dosStamp(date: Date): { time: number; date: number } {
	const year = Math.max(1980, date.getFullYear());
	return {
		time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
		date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
	};
}

/** Bit 11 tells the extractor the name is UTF-8. Without it, accents break. */
const FLAG_UTF8 = 0x0800;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;

/**
 * `Uint8Array<ArrayBuffer>` and not a bare `Uint8Array` throughout: the default
 * generic is `ArrayBufferLike`, which includes `SharedArrayBuffer` and therefore
 * satisfies neither `BlobPart` nor `BodyInit`. The error you get names
 * `URLSearchParams` and explains nothing.
 */
type Bytes = Uint8Array<ArrayBuffer>;

async function deflateRaw(bytes: Bytes): Promise<Bytes | null> {
	if (typeof CompressionStream === 'undefined') return null;
	try {
		const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
		return new Uint8Array(await new Response(stream).arrayBuffer());
	} catch {
		// An engine that names the format but won't do it. Store instead.
		return null;
	}
}

function concat(parts: Bytes[]): Bytes {
	const total = parts.reduce((sum, part) => sum + part.length, 0);
	const out = new Uint8Array(total);
	let at = 0;
	for (const part of parts) {
		out.set(part, at);
		at += part.length;
	}
	return out;
}

export async function zip(entries: ZipEntry[], now: Date): Promise<Bytes> {
	if (entries.length > MAX_ENTRIES) throw new Error('zip: demasiadas entradas');

	const stamp = dosStamp(now);
	const encoder = new TextEncoder();
	const locals: Bytes[] = [];
	const centrals: Bytes[] = [];
	let offset = 0;

	for (const entry of entries) {
		const name = encoder.encode(entry.name);
		const raw = encoder.encode(entry.content);
		const deflated = await deflateRaw(raw);
		// Compression that made the entry bigger is compression not worth doing —
		// tiny files deflate upwards.
		const useDeflate = deflated !== null && deflated.length < raw.length;
		const payload = useDeflate ? deflated : raw;
		const method = useDeflate ? METHOD_DEFLATE : METHOD_STORE;
		const crc = crc32(raw);

		const local = new Uint8Array(30 + name.length);
		const localView = new DataView(local.buffer);
		localView.setUint32(0, 0x04034b50, true);
		localView.setUint16(4, 20, true); // version needed
		localView.setUint16(6, FLAG_UTF8, true);
		localView.setUint16(8, method, true);
		localView.setUint16(10, stamp.time, true);
		localView.setUint16(12, stamp.date, true);
		localView.setUint32(14, crc, true);
		localView.setUint32(18, payload.length, true);
		localView.setUint32(22, raw.length, true);
		localView.setUint16(26, name.length, true);
		localView.setUint16(28, 0, true); // extra field length
		local.set(name, 30);

		const central = new Uint8Array(46 + name.length);
		const centralView = new DataView(central.buffer);
		centralView.setUint32(0, 0x02014b50, true);
		centralView.setUint16(4, 20, true); // version made by
		centralView.setUint16(6, 20, true); // version needed
		centralView.setUint16(8, FLAG_UTF8, true);
		centralView.setUint16(10, method, true);
		centralView.setUint16(12, stamp.time, true);
		centralView.setUint16(14, stamp.date, true);
		centralView.setUint32(16, crc, true);
		centralView.setUint32(20, payload.length, true);
		centralView.setUint32(24, raw.length, true);
		centralView.setUint16(28, name.length, true);
		centralView.setUint16(30, 0, true); // extra
		centralView.setUint16(32, 0, true); // comment
		centralView.setUint16(34, 0, true); // disk number
		centralView.setUint16(36, 0, true); // internal attributes
		// External attributes: 0644 in the high word, so an extractor on unix
		// doesn't hand out a file with no permissions at all.
		centralView.setUint32(38, 0o644 << 16, true);
		centralView.setUint32(42, offset, true);
		central.set(name, 46);

		locals.push(local, payload);
		centrals.push(central);
		offset += local.length + payload.length;
		if (offset > MAX_BYTES) throw new Error('zip: demasiados bytes');
	}

	const centralSize = centrals.reduce((total, part) => total + part.length, 0);
	const end = new Uint8Array(22);
	const endView = new DataView(end.buffer);
	endView.setUint32(0, 0x06054b50, true);
	endView.setUint16(4, 0, true); // this disk
	endView.setUint16(6, 0, true); // disk with the central directory
	endView.setUint16(8, entries.length, true);
	endView.setUint16(10, entries.length, true);
	endView.setUint32(12, centralSize, true);
	endView.setUint32(16, offset, true);
	endView.setUint16(20, 0, true); // comment length

	return concat([...locals, ...centrals, end]);
}
