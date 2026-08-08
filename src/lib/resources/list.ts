/**
 * The resources shown on the home page, under their own heading.
 *
 * A resource is not a tool. A tool is used here — you paste something, it gives
 * you something back, and the tab is where it happens. A resource is a file you
 * take away and open somewhere else. That is why they get their own section and
 * their own list instead of being appended to `src/lib/tools/list.ts`: mixed in,
 * a download reads as a fifth tool that doesn't work.
 *
 * Adding one is dropping an object in here, same as the tools: the home page
 * paints it on its own, and `$lib/og-cards.ts` gives it a share card from the
 * same `name` and `blurb`.
 *
 * There is no `capturesEmail` flag. Every resource asks for an address — that is
 * what a resource IS here. The page says so before the field, not after.
 */
export type Resource = {
	/** What the link reads as. */
	name: string;
	href: string;
	/** One short sentence: it clamps to two lines on screen. */
	blurb: string;
};

export const resources: Resource[] = [
	{
		name: 'Cervantes, tu redactor de newsletter',
		href: '/recursos/cervantes',
		blurb: 'Una carpeta que aprende cómo escribes y te ayuda a sacar tu newsletter cada semana.'
	}
];
