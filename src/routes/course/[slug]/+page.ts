import { error } from '@sveltejs/kit';
import { findCourse } from '$lib/courses/registry';
import type { PageLoad } from './$types';

/**
 * Resolve the slug against the course registry.
 *
 * It's `+page.ts` and not `+page.server.ts` because a course is a data object
 * from the repo: there are no secrets in it, so the runner can navigate without
 * round-tripping. Everything that is sensitive — sending the email — lives in
 * `+server.ts`.
 */
export const load: PageLoad = ({ params }) => {
	const course = findCourse(params.slug);
	if (!course) error(404, 'Ese curso no existe');
	return { course };
};
