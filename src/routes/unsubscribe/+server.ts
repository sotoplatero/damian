import type { RequestHandler } from '@sveltejs/kit';
import { verifyEmail } from '$lib/server/tokens';
import { unsubscribe } from '$lib/server/resend';

function page(message: string): Response {
	return new Response(
		`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Baja</title></head><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171717;background:#fff;"><div style="max-width:32rem;margin:18vh auto 0;padding:0 1.5rem;"><p style="font-size:1.15rem;line-height:1.6;">${message}</p></div></body></html>`,
		{ headers: { 'content-type': 'text/html; charset=utf-8' } }
	);
}

async function handle(email: string, token: string): Promise<Response> {
	if (!verifyEmail(email, token)) {
		return page('Enlace no válido o caducado.');
	}
	try {
		await unsubscribe(email);
		return page('Listo. No vuelves a saber de mí. Sin rencores.');
	} catch {
		return page('No se pudo procesar la baja. Escríbeme y te saco a mano.');
	}
}

export const GET: RequestHandler = ({ url }) =>
	handle((url.searchParams.get('e') ?? '').toLowerCase(), url.searchParams.get('t') ?? '');

// One-click unsubscribe (List-Unsubscribe-Post) sends a POST.
export const POST: RequestHandler = ({ url }) =>
	handle((url.searchParams.get('e') ?? '').toLowerCase(), url.searchParams.get('t') ?? '');
