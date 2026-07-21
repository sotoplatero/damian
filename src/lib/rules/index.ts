export type RuleStatus = 'pass' | 'fail' | 'warning';

export interface Rule {
	id: string;
	name: string;
	description: string;
	check: (placeData: any) => RuleResult;
}

export interface RuleResult {
	status: RuleStatus;
	message: string;
	recommendation?: string;
}

export interface EvaluationResult {
	rules: Array<{
		rule: {
			id: string;
			name: string;
			description: string;
		};
		result: RuleResult;
	}>;
	score: number;
	timestamp: Date;
}

// Basic rules that don't require AI
export const basicRules: Rule[] = [
	{
		id: 'has-phone',
		name: 'Phone Number',
		description: 'Business should have a phone number',
		check: (place) => {
			const hasPhone = !!place.formatted_phone_number || !!place.international_phone_number;
			return {
				status: hasPhone ? 'pass' : 'fail',
				message: hasPhone ? 'Phone number is present' : 'No phone number found',
				recommendation: hasPhone
					? undefined
					: 'Add a phone number to make it easier for customers to contact you'
			};
		}
	},
	{
		id: 'has-website',
		name: 'Website',
		description: 'Business should have a website URL',
		check: (place) => {
			const hasWebsite = !!place.website;
			return {
				status: hasWebsite ? 'pass' : 'warning',
				message: hasWebsite ? 'Website is present' : 'No website found',
				recommendation: hasWebsite
					? undefined
					: 'Add a website to provide more information about your business'
			};
		}
	},
	{
		id: 'has-opening-hours',
		name: 'Opening Hours',
		description: 'Business should have opening hours defined',
		check: (place) => {
			const hasHours = !!place.opening_hours;
			return {
				status: hasHours ? 'pass' : 'fail',
				message: hasHours ? 'Opening hours are defined' : 'No opening hours found',
				recommendation: hasHours
					? undefined
					: 'Add opening hours so customers know when you are available'
			};
		}
	},
	{
		id: 'has-photos',
		name: 'Owner Photos',
		description: 'Business should have photos uploaded by the owner',
		check: (place) => {
			const photos = place.photos || [];
			const ownerPhotos = photos.filter((photo: any) => {
				const attributions = photo.html_attributions?.[0] || '';
				// Las fotos del owner generalmente incluyen el nombre del negocio
				return attributions.includes(place.name);
			});

			const ownerPhotoCount = ownerPhotos.length;
			const totalPhotoCount = photos.length;

			if (ownerPhotoCount === 0) {
				return {
					status: 'fail',
					message: `No owner photos found (${totalPhotoCount} customer photos)`,
					recommendation: 'Upload photos of your business to have more control over how it appears'
				};
			} else if (ownerPhotoCount < 5) {
				return {
					status: 'warning',
					message: `Only ${ownerPhotoCount} owner photo(s) found (${totalPhotoCount} total)`,
					recommendation: 'Add more owner photos (at least 5) to better represent your business'
				};
			}
			return {
				status: 'pass',
				message: `${ownerPhotoCount} owner photos found (${totalPhotoCount} total)`
			};
		}
	},
	{
		id: 'has-reviews',
		name: 'Reviews',
		description: 'Business should have customer reviews',
		check: (place) => {
			const reviewCount = place.user_ratings_total || 0;
			const rating = place.rating || 0;
			if (reviewCount === 0) {
				return {
					status: 'warning',
					message: 'No reviews yet',
					recommendation: 'Encourage customers to leave reviews'
				};
			}
			return {
				status: 'pass',
				message: `${reviewCount} reviews with ${rating} average rating`
			};
		}
	},
	{
		id: 'has-description',
		name: 'Business Description',
		description: 'Business should have a description in Google My Business',
		check: (place) => {
			// editorial_summary viene de la API básica de Google Places
			const hasEditorialSummary = !!place.editorial_summary?.overview || !!place.editorial_summary;
			const hasDescription = !!place.description;

			const hasAnyDescription = hasEditorialSummary || hasDescription;

			if (!hasAnyDescription) {
				return {
					status: 'warning',
					message: 'No business description found',
					recommendation:
						'Add a business description in Google My Business to help customers understand what you offer'
				};
			}

			return {
				status: 'pass',
				message: 'Business description is present'
			};
		}
	},
	{
		id: 'has-products-or-services',
		name: 'Products/Services',
		description: 'Business should have products or services listed',
		check: (place) => {
			// Buscar indicadores de productos/servicios
			const hasMenu = !!place.menu;
			const hasServices = !!place.services;
			const hasProducts = !!place.products;

			// Algunas categorías implican servicios
			const serviceTypes = place.types || [];
			const isServiceBusiness =
				serviceTypes.some((type: string) =>
					[
						'health',
						'doctor',
						'dentist',
						'lawyer',
						'accounting',
						'beauty_salon',
						'spa',
						'gym',
						'school'
					].includes(type)
				) || hasServices;

			const isRetailBusiness =
				serviceTypes.some((type: string) =>
					['store', 'shopping', 'supermarket', 'clothing_store', 'electronics_store'].includes(
						type
					)
				) || hasProducts;

			const isRestaurant =
				serviceTypes.some((type: string) =>
					['restaurant', 'cafe', 'bar', 'food', 'meal_delivery', 'meal_takeaway'].includes(type)
				) || hasMenu;

			if (isRestaurant || isServiceBusiness || isRetailBusiness || hasMenu || hasServices || hasProducts) {
				return {
					status: 'pass',
					message: 'Business type identified (products/services implied)'
				};
			}

			return {
				status: 'warning',
				message: 'Unable to determine products or services',
				recommendation:
					'Add products, services, or menu items in Google My Business to help customers know what you offer'
			};
		}
	},
	{
		id: 'has-categories',
		name: 'Business Categories',
		description: 'Business should have clear categories defined',
		check: (place) => {
			const types = place.types || [];

			// Excluir categorías genéricas
			const specificTypes = types.filter(
				(type: string) => !['point_of_interest', 'establishment'].includes(type)
			);

			if (specificTypes.length === 0) {
				return {
					status: 'fail',
					message: 'No specific categories found',
					recommendation:
						'Add specific business categories in Google My Business to help customers find you'
				};
			} else if (specificTypes.length === 1) {
				return {
					status: 'warning',
					message: `Only 1 category: ${specificTypes[0].replace(/_/g, ' ')}`,
					recommendation: 'Add more relevant categories to improve discoverability'
				};
			}

			const categoryList = specificTypes
				.slice(0, 3)
				.map((t: string) => t.replace(/_/g, ' '))
				.join(', ');

			return {
				status: 'pass',
				message: `${specificTypes.length} categories: ${categoryList}${specificTypes.length > 3 ? '...' : ''}`
			};
		}
	},
	{
		id: 'has-address',
		name: 'Address',
		description: 'Business should have a complete address',
		check: (place) => {
			const hasAddress = !!place.formatted_address;
			return {
				status: hasAddress ? 'pass' : 'fail',
				message: hasAddress ? 'Address is present' : 'No address found',
				recommendation: hasAddress ? undefined : 'Add a complete address for your business'
			};
		}
	},
	{
		id: 'has-faq',
		name: 'FAQ Section',
		description: 'Business should have frequently asked questions',
		check: (place) => {
			// Google My Business puede tener questions (Q&A)
			const hasQuestions = !!place.questions && place.questions.length > 0;
			const questionCount = place.questions?.length || 0;

			if (questionCount === 0) {
				return {
					status: 'warning',
					message: 'No FAQ or Q&A found',
					recommendation:
						'Add frequently asked questions in Google My Business to help customers find quick answers'
				};
			} else if (questionCount < 3) {
				return {
					status: 'warning',
					message: `Only ${questionCount} Q&A found`,
					recommendation: 'Add more frequently asked questions (at least 3-5) to cover common inquiries'
				};
			}

			return {
				status: 'pass',
				message: `${questionCount} Q&A found`
			};
		}
	}
];

export function evaluatePlace(placeData: any): EvaluationResult {
	const results = basicRules.map((rule) => ({
		rule: {
			id: rule.id,
			name: rule.name,
			description: rule.description
		},
		result: rule.check(placeData)
	}));

	// Calculate score: pass = 1, warning = 0.5, fail = 0
	const totalScore = results.reduce((sum, { result }) => {
		if (result.status === 'pass') return sum + 1;
		if (result.status === 'warning') return sum + 0.5;
		return sum;
	}, 0);

	const score = Math.round((totalScore / basicRules.length) * 100);

	return {
		rules: results,
		score,
		timestamp: new Date()
	};
}
