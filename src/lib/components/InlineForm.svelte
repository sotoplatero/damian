<script lang="ts">
	/**
	 * The field and its button. The form every tool and every download uses.
	 *
	 * It was copied four times over (the URL and the email wall of each of the two
	 * tools that existed), so any adjustment had to be made four times.
	 *
	 * SIDE BY SIDE FROM 640px, STACKED BELOW IT (see the frame below).
	 *
	 * THE BUTTON IS NOT DISABLED FOR BEING EMPTY, only for being busy. It used to
	 * arrive greyed out — the page's only action reading as broken before anybody
	 * had touched it — and a disabled button is also the one control that cannot
	 * explain itself: no focus, no click, no message. The field is `required`, so
	 * the browser stops an empty submit itself and says which field it wants, in
	 * the visitor's own language. `handle` still guards the whitespace-only case
	 * that `required` lets through.
	 */
	let {
		value = $bindable(''),
		type = 'text',
		placeholder = '',
		/** The button's text at rest. */
		label,
		/**
		 * The field's accessible name.
		 *
		 * NO FORM ON THIS SITE HAD ONE. There is no visible `<label>` anywhere by
		 * design — the headline and the note around the field say what it wants, and
		 * a label above a single field would be a third thing saying it — but a
		 * placeholder is not an accessible name: it is a hint, browsers disagree
		 * about whether to expose it, and it disappears the moment anybody types.
		 * So a screen reader announced the most important control on the site as
		 * «edit text».
		 *
		 * An EMAIL field falls back to a real name, because every email field on
		 * this site wants the same one and the placeholder is always the same
		 * example address. That default is what stops the next form anybody adds
		 * from shipping «tu@email.com» as its accessible name — six of them had,
		 * and a rule that has to be remembered on every call site is a rule that
		 * gets forgotten on the seventh.
		 *
		 * A text field cannot be defaulted the same way: on this site it is a URL
		 * on one page and a sentence about a missing tool on another. Those pass
		 * their own, and the placeholder is the last resort.
		 */
		fieldLabel,
		/** Texto del botón mientras trabaja. */
		busyLabel = label,
		busy = false,
		/** Deshabilita el botón si el campo está vacío. */
		requireValue = true,
		inputmode,
		autocomplete,
		/**
		 * Whether pressing the button puts the address on a list. It decides the
		 * colour, and the colour is a meaning: Substack's blue says «this signs you
		 * up». An email field does — every one on this site subscribes — so it
		 * defaults to blue; a text field (a URL, an idea, a missing tool) is ink.
		 */
		subscribes = type === 'email',
		onsubmit
	}: {
		value?: string;
		type?: 'text' | 'email';
		placeholder?: string;
		label: string;
		fieldLabel?: string;
		busyLabel?: string;
		busy?: boolean;
		requireValue?: boolean;
		inputmode?: 'url' | 'email' | 'text';
		autocomplete?: 'url' | 'email';
		subscribes?: boolean;
		onsubmit: () => void;
	} = $props();

	function handle(event: SubmitEvent) {
		event.preventDefault();
		if (busy) return;
		if (requireValue && !value.trim()) return;
		onsubmit();
	}
</script>

<!--
	THE FRAME: one ink bar holding the field and its button, the same on every form
	on the site. Stacked below 640px and side by side above — MEASURED at 390px, a
	field sharing its line with the button was 200px wide and an address scrolled
	inside its own box. The stacking lives in `.frame` in app.css.
-->
<form onsubmit={handle} class="frame">
	<input
		{type}
		bind:value
		{placeholder}
		{inputmode}
		{autocomplete}
		aria-label={fieldLabel ?? (type === 'email' ? 'Tu correo electrónico' : placeholder)}
		required={requireValue}
		disabled={busy}
		class="frame-field"
	/>
	<button type="submit" disabled={busy} class="frame-button" class:is-subscribe={subscribes}>
		{#if busy}<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>{/if}
		<span>{busy ? busyLabel : label}</span>
	</button>
</form>
