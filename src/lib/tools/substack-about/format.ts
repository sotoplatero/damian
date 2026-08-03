import type { AboutAudit } from './prompt';
import { escapeMarkdown } from '$lib/tools/markdown';

export function toMarkdown(site: string, audit: AboutAudit): string {
	const e = escapeMarkdown;
	const findings = audit.findings.map((f) => `### ${e(f.criterion)} — ${e(f.status)}\n\n**Lo que vi:** ${e(f.evidence)}\n\n**Qué cambiar:** ${e(f.fix)}`).join('\n\n');
	const benefits = audit.rewrite.benefits.map((item) => `- ${e(item)}`).join('\n');
	return `# El Acerca de de ${e(site)}\n\n${e(audit.diagnosis.verdict)}\n\n## El diagnóstico\n\n**De qué va:** ${e(audit.diagnosis.topic)}\n\n**Para quién:** ${e(audit.diagnosis.reader)}\n\n**Qué se lleva:** ${e(audit.diagnosis.benefit)}\n\n${findings}\n\n## Versión reescrita\n\n# ${e(audit.rewrite.promise)}\n\n${e(audit.rewrite.intro)}\n\n${benefits}\n\n${e(audit.rewrite.proof)}\n\n${e(audit.rewrite.expectations)}\n\n**${e(audit.rewrite.cta)}**`;
}
