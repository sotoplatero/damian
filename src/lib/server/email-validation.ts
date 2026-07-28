/**
 * Filtro de correos de usar y tirar.
 *
 * Una sola capa: lista de dominios desechables conocidos. Nunca está completa
 * —registran dominios nuevos cada semana—, pero corta el grueso de los buzones
 * temporales sin añadir latencia ni pedirle nada de más al visitante.
 */

/** Dominios de correo temporal más usados. */
const DISPOSABLE = new Set([
	'0-mail.com',
	'10minutemail.com',
	'10minutemail.net',
	'20minutemail.com',
	'33mail.com',
	'anonbox.net',
	'byom.de',
	'dispostable.com',
	'dropmail.me',
	'emailondeck.com',
	'emailtemporario.com.br',
	'fakeinbox.com',
	'fakemail.net',
	'getairmail.com',
	'getnada.com',
	'guerrillamail.biz',
	'guerrillamail.com',
	'guerrillamail.de',
	'guerrillamail.info',
	'guerrillamail.net',
	'guerrillamail.org',
	'guerrillamailblock.com',
	'harakirimail.com',
	'inboxbear.com',
	'inboxkitten.com',
	'jetable.org',
	'linshiyouxiang.net',
	'mail-temporaire.fr',
	'mail7.io',
	'mailcatch.com',
	'maildrop.cc',
	'mailexpire.com',
	'mailforspam.com',
	'mailinator.com',
	'mailnesia.com',
	'mailsac.com',
	'mailtemp.info',
	'mintemail.com',
	'mohmal.com',
	'moakt.com',
	'mytemp.email',
	'nada.email',
	'no-spam.ws',
	'nowmymail.com',
	'onetimemail.org',
	'pokemail.net',
	'sharklasers.com',
	'spam4.me',
	'spamgourmet.com',
	'spambox.us',
	'spamdecoy.net',
	'temp-mail.io',
	'temp-mail.org',
	'tempail.com',
	'tempinbox.com',
	'tempm.com',
	'tempmail.com',
	'tempmail.net',
	'tempmail.plus',
	'tempmailo.com',
	'tempr.email',
	'throwawaymail.com',
	'trashmail.com',
	'trashmail.de',
	'trashmail.me',
	'trashmail.net',
	'wegwerfmail.de',
	'yopmail.com',
	'yopmail.fr',
	'yopmail.net',
	'zetmail.com'
]);

/** Sufijos que cubren las mil variantes que registran estos servicios. */
const DISPOSABLE_SUFFIXES = [
	'.mailinator.com',
	'.yopmail.com',
	'.temp-mail.org',
	'.trashmail.com',
	'.33mail.com',
	'.dropmail.me',
	'.guerrillamail.com'
];

export function isDisposable(email: string): boolean {
	const domain = email.split('@')[1]?.toLowerCase();
	if (!domain) return false;
	if (DISPOSABLE.has(domain)) return true;
	return DISPOSABLE_SUFFIXES.some((suffix) => domain.endsWith(suffix));
}
