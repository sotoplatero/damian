import { describe, expect, it } from 'vitest';
import { buildManualPrompt } from './manual-prompt';

describe('buildManualPrompt', () => {
	it('is self-contained and includes the approved constraints', () => {
		const prompt = buildManualPrompt();
		expect(prompt).toContain('Pásame la URL del artículo que quieres distribuir');
		expect(prompt).toContain('intenta acceder al artículo');
		expect(prompt).toContain('pide al usuario que pegue el texto completo');
		expect(prompt).not.toContain('[PEGA AQUÍ');
		expect(prompt).toContain('Idea central');
		expect(prompt).toContain('Puerta al artículo');
		expect(prompt).toContain('ANTIPATRONES DE TEXTO GENERADO POR IA');
		expect(prompt).toContain('700 caracteres');
		expect(prompt).not.toMatch(/español de España|Substack|LinkedIn|Twitter/);
	});
});
