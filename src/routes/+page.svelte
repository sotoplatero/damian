<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { ArrowUpRight, ArrowRight } from 'lucide-svelte';

	const projects = [
		{
			name: 'freebie.email',
			description: m.freebie_email_description(),
			url: 'https://freebie.email',
			logo: 'https://freebie.email/favicon.ico'
		},
		{
			name: 'article.video',
			description: m.article_video_description(),
			url: 'https://article.video',
			logo: 'https://article.video/favicon.ico'
		},
		{
			name: 'rooster.social',
			description: m.rooster_social_description(),
			url: 'https://rooster.social',
			logo: 'https://rooster.social/favicon.ico'
		}
	];

	const tools = [
		{
			name: m.uuid_generator_title(),
			description: m.uuid_generator_description(),
			url: '/tool/uuid-generator'
		},
		{
			name: m.character_counter_title(),
			description: m.character_counter_description(),
			url: '/tool/character-counter'
		}
	];
</script>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="w-full max-w-lg space-y-8">
		<!-- Header -->
		<div class="text-center space-y-4">
			<div class="avatar">
				<div class="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
					<img
						src="https://github.com/{m.username()}.png"
						alt={m.name()}
					/>
				</div>
			</div>
			<div class="space-y-2">
				<h1 class="text-4xl font-bold">{m.name()}</h1>
				<a
					href="https://x.com/{m.username()}"
					target="_blank"
					rel="noopener noreferrer"
					class="text-sm opacity-70 hover:opacity-100 transition-opacity"
				>
					@{m.username()}
				</a>
				<p class="text-base opacity-80">{m.description()}</p>
			</div>
		</div>

		<!-- Projects -->
		<div class="space-y-3">
			<h2 class="text-xl font-semibold text-center">{m.projects_title()}</h2>
			<div class="space-y-4">
				{#each projects as project}
					<a
						href={project.url}
						target="_blank"
						rel="noopener noreferrer"
						class="btn btn-block btn-ghost btn-xl flex items-center justify-between h-auto py-4"
					>
						<div class="flex items-center gap-3 flex-1">
							<div class="avatar">
								<div class="w-8 rounded">
									<img src={project.logo} alt={project.name} />
								</div>
							</div>
							<div class="flex flex-col items-start">
								<span class="font-semibold">{project.name}</span>
								<span class="text-sm opacity-70 font-normal">{project.description}</span>
							</div>
						</div>
						<ArrowUpRight size={20} class="opacity-50" />
					</a>
				{/each}
			</div>
		</div>

		<!-- Tools -->
		<div class="space-y-3">
			<h2 class="text-xl font-semibold text-center">{m.tools_title()}</h2>
			<div class="space-y-4">
				{#each tools as tool}
					<a
						href={tool.url}
						class="btn btn-block btn-ghost btn-xl flex items-center justify-between h-auto py-4"
					>
						<div class="flex flex-col items-start flex-1">
							<span class="font-light">{tool.name}</span>
							<span class="text-sm opacity-70 font-normal">{tool.description}</span>
						</div>
						<ArrowRight size={20} class="opacity-50" />
					</a>
				{/each}
			</div>
		</div>
	</div>
</div>
