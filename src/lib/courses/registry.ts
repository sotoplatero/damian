import type { Course } from './types';
import { course as crisBudget } from './cris-budget/course';

/**
 * The course index. One creator, one folder, one entry here.
 *
 * It lives apart from `src/lib/tools/list.ts` on purpose: that list decides which
 * tools get RENDERED on the home page, and this is only slug-to-course
 * resolution. A course added here is live by URL and shows up nowhere, which is
 * what we want right now — the Cris course is a private demo to show her before
 * the conversation happens, not something published with her name on it.
 *
 * When one has to go public it will be linked from wherever it belongs; no new
 * mechanism is needed here. Same pattern `/tool/newsletter` and
 * `/tool/places-evaluator` already follow: live by URL, unlisted.
 */
const courses: Course[] = [crisBudget];

export function findCourse(slug: string): Course | undefined {
	return courses.find((course) => course.slug === slug);
}

/** The slugs, so callers can enumerate without importing every course. */
export function courseSlugs(): string[] {
	return courses.map((course) => course.slug);
}
