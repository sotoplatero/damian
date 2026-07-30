/**
 * Límites de uso, en un solo sitio.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LO QUE ESTO ES Y LO QUE NO
 *
 * El contador vive en memoria del proceso. En serverless cada instancia tiene
 * el suyo, así que el límite real es el configurado MULTIPLICADO por el número
 * de instancias que la plataforma tenga calientes. Con el tráfico de este sitio
 * serán una o dos, así que frena el abuso de verdad; pero no es exacto y no hay
 * que venderlo como tal.
 *
 * Para un límite diario exacto hace falta un almacén compartido (Redis/KV). Ese
 * es el único cambio pendiente: la firma de `overLimit` no tendría que cambiar,
 * solo su interior.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * POR QUÉ LA CLAVE NO ES SIEMPRE LA IP
 *
 * Una IP no es una persona. En redes móviles miles de usuarios salen por unas
 * pocas IPs, y en una oficina todos comparten una. Un límite bajo por IP deja
 * fuera a compañeros de trabajo de quien lo gastó.
 *
 * Por eso lo caro se limita por CORREO, que sí identifica a alguien, y lo
 * gratis por IP con margen holgado.
 */

type Hit = { at: number };

/** Un cubo por nombre, para que un endpoint no se coma la cuota de otro. */
const buckets = new Map<string, Map<string, Hit[]>>();

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Los límites del sitio, juntos para poder leerlos de un vistazo.
 *
 * `max` es por `windowMs` y por clave. El coste anotado es lo que evita cada uno
 * en el peor caso, que es la razón de que el número sea ese y no otro.
 */
export const LIMITS = {
	/** Paso gratis de cualquier herramienta. Holgado: aquí casi no hay gasto. */
	toolPreview: { max: 15, windowMs: DAY_MS },

	/**
	 * Paso caro, el que corre tras dejar el correo. Tres al día por dirección da
	 * de sobra para el sitio propio, el de un cliente y un reintento. Y obliga a
	 * un atacante a conseguir un correo válido y no desechable cada tres usos.
	 */
	toolDelivery: { max: 3, windowMs: DAY_MS },

	/** Techo por IP en el paso caro, para que nadie encadene cien correos desde una. */
	toolDeliveryPerIp: { max: 10, windowMs: DAY_MS },

	/** Google Places cuesta ~$0,086 por evaluación. Diez al día son ~$0,86 por IP. */
	places: { max: 10, windowMs: DAY_MS },

	/** El autocompletado se dispara al teclear. Generoso, pero con techo. */
	placesAutocomplete: { max: 60, windowMs: HOUR_MS },

	/** El alta escribe en Resend y manda un correo. No debería repetirse mucho. */
	subscribe: { max: 5, windowMs: DAY_MS }
} as const;

export type LimitName = keyof typeof LIMITS;

/**
 * Cuenta un intento y dice si se ha pasado del límite.
 *
 * Cuenta SIEMPRE, incluso cuando devuelve true: así quien insiste no se
 * recupera antes por seguir dándole.
 */
export function overLimit(name: LimitName, key: string): boolean {
	const { max, windowMs } = LIMITS[name];
	const now = Date.now();

	let bucket = buckets.get(name);
	if (!bucket) {
		bucket = new Map();
		buckets.set(name, bucket);
	}

	const recent = (bucket.get(key) ?? []).filter((hit) => now - hit.at < windowMs);
	recent.push({ at: now });
	bucket.set(key, recent);

	// Poda perezosa: sin esto el Map crece mientras viva la instancia.
	if (bucket.size > 5_000) {
		for (const [k, hits] of bucket) {
			if (hits.every((hit) => now - hit.at >= windowMs)) bucket.delete(k);
		}
	}

	return recent.length > max;
}

/** Cuánto queda en la ventana, para poder decirlo en el mensaje de error. */
export function remaining(name: LimitName, key: string): number {
	const { max, windowMs } = LIMITS[name];
	const now = Date.now();
	const hits = (buckets.get(name)?.get(key) ?? []).filter((hit) => now - hit.at < windowMs);
	return Math.max(0, max - hits.length);
}
