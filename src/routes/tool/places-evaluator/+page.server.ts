import { fail } from '@sveltejs/kit';
import { GOOGLE_PLACES_API_KEY } from '$env/static/private';
import { evaluatePlace } from '$lib/rules';
import type { Actions } from './$types';

async function fetchPlaceBySearch(query: string) {
	// Text Search
	const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
	const searchResponse = await fetch(searchUrl);
	const searchData = await searchResponse.json();

	if (!searchData.results || searchData.results.length === 0) {
		return null;
	}

	const placeId = searchData.results[0].place_id;
	return fetchPlaceDetails(placeId);
}

async function fetchPlaceDetails(placeId: string) {
	const fields = [
		'place_id',
		'name',
		'formatted_address',
		'formatted_phone_number',
		'international_phone_number',
		'website',
		'opening_hours',
		'photos',
		'rating',
		'user_ratings_total',
		'reviews',
		'editorial_summary',
		'business_status',
		'types',
		'url'
	].join(',');

	const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`;
	const detailsResponse = await fetch(detailsUrl);
	const detailsData = await detailsResponse.json();

	if (detailsData.status !== 'OK') {
		return null;
	}

	return detailsData.result;
}

function extractPlaceIdFromUrl(url: string): string | null {
	// Extract place_id from Google Maps URL
	const patterns = [
		/place_id=([^&]+)/,
		/maps\/place\/[^/]+\/data=.*!1s([^!]+)/,
		/\/place\/.*\/@.*\/data=.*!1s([^!]+)/
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) return match[1];
	}

	return null;
}

function detectInputType(input: string): 'placeId' | 'url' | 'search' {
	// Check if it's a URL
	if (input.startsWith('http://') || input.startsWith('https://')) {
		return 'url';
	}

	// Check if it looks like a Place ID (alphanumeric string, no spaces, typically starts with ChIJ)
	if (/^[A-Za-z0-9_-]+$/.test(input) && input.length > 20) {
		return 'placeId';
	}

	// Default to search query
	return 'search';
}

export const actions = {
	evaluate: async ({ request }) => {
		const formData = await request.formData();
		const input = formData.get('search')?.toString()?.trim();
		const placeId = formData.get('place_id')?.toString()?.trim();

		if (!input) {
			return fail(400, { error: 'Please provide a business name, Place ID, or Google Maps URL' });
		}

		let placeData = null;

		try {
			// Si tenemos place_id del autocomplete, usarlo directamente
			if (placeId) {
				console.log('Using place_id from autocomplete:', placeId);
				placeData = await fetchPlaceDetails(placeId);
			} else {
				const inputType = detectInputType(input);

				switch (inputType) {
					case 'placeId':
						placeData = await fetchPlaceDetails(input);
						break;
					case 'url':
						const extractedPlaceId = extractPlaceIdFromUrl(input);
						if (extractedPlaceId) {
							placeData = await fetchPlaceDetails(extractedPlaceId);
						}
						break;
					case 'search':
						placeData = await fetchPlaceBySearch(input);
						break;
				}
			}

			if (!placeData) {
				return fail(404, { error: 'Business not found' });
			}

			console.log('Place data keys:', Object.keys(placeData));
			console.log('editorial_summary:', placeData.editorial_summary);
			console.log('Types:', placeData.types);

			const evaluation = evaluatePlace(placeData);

			return {
				success: true,
				place: {
					name: placeData.name,
					address: placeData.formatted_address,
					url: placeData.url
				},
				evaluation
			};
		} catch (error) {
			console.error('Error evaluating place:', error);
			return fail(500, { error: 'Failed to evaluate business' });
		}
	},
	autocomplete: async ({ request }) => {
		const formData = await request.formData();
		const query = formData.get('query')?.toString()?.trim();

		console.log('[SERVER] Autocomplete request received, query:', query);

		if (!query || query.length < 2) {
			console.log('[SERVER] Query too short or empty');
			return { suggestions: [] };
		}

		try {
			const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
			const response = await fetch(autocompleteUrl);
			const data = await response.json();

			console.log('[SERVER] Google API response status:', data.status);

			if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
				console.log('[SERVER] API error:', data.status, data.error_message);
				return { suggestions: [] };
			}

			const suggestions = (data.predictions || []).map((prediction: any) => ({
				description: prediction.description,
				place_id: prediction.place_id
			}));

			console.log('[SERVER] Returning suggestions:', suggestions.length);

			return { suggestions };
		} catch (error) {
			console.error('[SERVER] Error fetching autocomplete:', error);
			return { suggestions: [] };
		}
	}
} satisfies Actions;
