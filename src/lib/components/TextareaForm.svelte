<script lang="ts">
	/**
	 * Campo de varias líneas con el botón debajo. El hermano de `InlineForm`.
	 *
	 * Existe porque `InlineForm` es campo y botón EN LA MISMA LÍNEA, y eso solo
	 * funciona con una URL o un correo. Cuando lo que se pide es una idea escrita,
	 * hace falta sitio para escribirla y el botón no cabe al lado. No se le añadió
	 * un `multiline` a `InlineForm` porque lo usan cuatro formularios y dejaría su
	 * nombre y su comentario mintiendo.
	 *
	 * En un textarea el Enter tiene que hacer salto de línea, así que se envía con
	 * Ctrl+Enter (o Cmd+Enter en Mac) y con el botón. Se avisa debajo, porque un
	 * atajo que no se ve no existe.
	 */
	let {
		value = $bindable(''),
		placeholder = '',
		/** Texto del botón en reposo. */
		label,
		/** Texto del botón mientras trabaja. */
		busyLabel = label,
		busy = false,
		/** Mínimo de caracteres para poder enviar. El mismo que valida el servidor. */
		minLength = 0,
		maxLength,
		rows = 5,
		/** La nota de debajo: el atajo, o lo que falte por escribir. */
		hint = '',
		/**
		 * The field's accessible name. A placeholder is not one — it is an example,
		 * and it vanishes as soon as anybody types.
		 */
		fieldLabel = 'Tu idea',
		onsubmit
	}: {
		value?: string;
		placeholder?: string;
		label: string;
		busyLabel?: string;
		busy?: boolean;
		minLength?: number;
		maxLength?: number;
		rows?: number;
		hint?: string;
		fieldLabel?: string;
		onsubmit: () => void;
	} = $props();

	const ready = $derived(value.trim().length >= minLength);

	let form: HTMLFormElement | undefined = $state();

	function handle(event: SubmitEvent) {
		event.preventDefault();
		if (busy || !ready) return;
		onsubmit();
	}

	/*
	 * Ctrl/Cmd+Enter goes through `requestSubmit`, not straight to `onsubmit`, so
	 * the browser's own validation runs first: a too-short idea gets the browser's
	 * message, in the visitor's language, instead of a keypress that does nothing.
	 */
	function keydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			form?.requestSubmit();
		}
	}
</script>

<!--
	The same ink frame as `InlineForm`, stacked at every width because a textarea
	needs the whole measure. THE BUTTON IS DISABLED FOR BEING BUSY, NEVER FOR BEING
	SHORT: it used to arrive greyed out, the page's one action reading as broken.
	`required` + `minlength` let the browser stop a short submit and say why.
-->
<form bind:this={form} onsubmit={handle}>
	<div class="frame frame-stack">
		<textarea
			bind:value
			{placeholder}
			{rows}
			required
			minlength={minLength || undefined}
			maxlength={maxLength}
			disabled={busy}
			onkeydown={keydown}
			aria-label={fieldLabel}
			class="frame-field frame-area"
		></textarea>
		<button type="submit" disabled={busy} class="frame-button">
			{#if busy}<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>{/if}
			<span>{busy ? busyLabel : label}</span>
		</button>
	</div>
	{#if hint}<p class="muted mt-3">{hint}</p>{/if}
</form>
