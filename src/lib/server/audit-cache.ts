/**
 * Guarda la auditoría del paso gratis para que el paso de pago no la repita.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PARA QUÉ EXISTE, QUE NO ES AHORRAR
 *
 * Es para que el informe del correo diga lo MISMO que la pantalla. Antes el
 * paso de desbloqueo volvía a pedirle el juicio al modelo con la misma entrada,
 * y un modelo no es determinista: la nota y el veredicto que alguien leía en
 * pantalla podían no ser los que le llegaban al correo. Ahorrar la llamada es el
 * efecto secundario, no el motivo.
 *
 * Vive en memoria del proceso, igual que el contador de `rate-limit.ts`, con la
 * misma consecuencia: en serverless cada instancia tiene el suyo. Un fallo de
 * caché NO rompe nada, solo obliga a recalcular — y por eso el paso de pago
 * tiene que poder rehacer la auditoría entera él solo, con el mismo resultado.
 *
 * Si algún día hace falta que sea exacto entre instancias, lo único que cambia
 * es el interior de estas dos funciones (Redis/KV).
 * ─────────────────────────────────────────────────────────────────────────
 */

const TTL_MS = 15 * 60 * 1000;
/** Techo de entradas. Cada una lleva un snapshot, así que no puede crecer sin fin. */
const MAX_ENTRIES = 200;

type Entry<T> = { at: number; value: T };

const store = new Map<string, Entry<unknown>>();

export function cacheAudit<T>(key: string, value: T): void {
	const now = Date.now();
	store.set(key, { at: now, value });

	// Poda perezosa: primero lo caducado y, si aún sobra, lo más antiguo.
	if (store.size > MAX_ENTRIES) {
		for (const [k, entry] of store) {
			if (now - entry.at >= TTL_MS) store.delete(k);
		}
		while (store.size > MAX_ENTRIES) {
			const oldest = store.keys().next();
			if (oldest.done) break;
			store.delete(oldest.value);
		}
	}
}

export function readAudit<T>(key: string): T | null {
	const entry = store.get(key);
	if (!entry) return null;
	if (Date.now() - entry.at >= TTL_MS) {
		store.delete(key);
		return null;
	}
	return entry.value as T;
}
