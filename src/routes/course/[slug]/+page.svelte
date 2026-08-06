<script lang="ts">
	/** UI strings belong to every course; the content belongs to the course. */
	import { t } from '$lib/courses/copy';
	import CourseRunner from '$lib/components/course/CourseRunner.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.course.title}</title>
	<!--
		NOINDEX ON PURPOSE, NOT AN OVERSIGHT.

		These courses are built on a real person's content and are made BEFORE
		talking to them: they are private demos to show that person. Google indexing
		the course about someone you haven't spoken to yet is the worst possible way
		for them to find out.

		No `PageMeta` either: we don't want a share card or a canonical, and the
		`/og/<slug>.png` image doesn't exist for these routes. When a course goes
		public with permission, that's when it gets PageMeta and loses this line.
	-->
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<CourseRunner course={data.course} {t} />
