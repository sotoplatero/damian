---
# Delivery email for /course/[slug]. The filename is NOT numeric, so emails.ts
# keeps it out of the daily sequence: this is sent on demand via renderStandalone.
#
# The REPORT marker in the body is replaced by whatever src/lib/courses/report.ts
# builds. Don't write that marker in braces up here in the frontmatter: the
# substitution only touches the body, but there's no reason to push our luck.
#
# The subject is the same for every course. If one ever needs its own, the place
# for it is a field on the course definition, not another email file.
#
# This is where the creator gets named. The course body doesn't mention them, so
# the credit has to land somewhere, and this is the somewhere for the email.
subject: Lo que acabas de hacer, para que no se pierda
---

Aquí tienes lo tuyo: tus cifras, lo que has contestado y los enlaces para seguir leyendo.

No hay nota. No es un examen y no me corresponde puntuar lo que haces con tu dinero.

{{REPORT}}

---

**Una cosa más**

Este curso está construido sobre el contenido de [Una Chica en Finanzas](https://unachicaenfinanzas.substack.com), de Cris. El mérito de lo que has leído es suyo; yo solo lo he convertido en algo con lo que se puede trastear.

Si algo de esto te ha servido, detrás de esos enlaces está mucho mejor contado.

**Damian**
