# DataForSEO Home-Care Niche Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private terminal command that uses DataForSEO keyword and local SERP evidence to recommend the strongest home-care subniche for entering the Hamilton–Burlington market.

**Architecture:** A reusable server-only DataForSEO client normalizes API responses and accounts for cost. Pure research modules own the candidate catalogue, query cleaning, scoring, sensitivity checks, and terminal rendering; a thin CLI orchestrates paid calls, confirmation, and budget enforcement.

**Tech Stack:** TypeScript 5.9, Node.js, `tsx`, Vitest 3, SvelteKit private environment conventions, DataForSEO API v3 Live endpoints.

## Global Constraints

- Run locally through `pnpm research:niches`; do not add a web route or public API.
- Credentials are `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD`; real values live only in ignored `.env` and must never be logged.
- Use English Google data for exact city-level Hamilton and Burlington locations in Ontario, Canada.
- Use Google Ads Search Volume Live for keyword metrics and Google Organic plus Local Finder Live for shortlisted competition evidence.
- Do not persist reports, API responses, JSON, CSV, or Markdown; print results only to the terminal.
- Default hard spending ceiling is USD 1.00; allow an explicit `--max-cost-usd` override.
- Require interactive confirmation before the full paid run.
- Do not retry a potentially billable request automatically.
- Keep equivalent query variants in one intent cluster and do not naively sum them as independent buyers.
- Show component scores, API cost, warnings, strongest counterargument, sensitivity result, and a suggested market test.
- Preserve unrelated user changes already present in the worktree.

## File Structure

- `src/lib/server/dataforseo.ts`: Basic Auth, HTTP/task error validation, normalized API operations, and per-call cost.
- `src/lib/server/dataforseo.test.ts`: mocked client contract, error, secret-safety, and cost tests.
- `scripts/lib/home-care-catalogue.ts`: controlled candidates, seed terms, business-model ratings, and exclusion vocabulary.
- `scripts/lib/home-care-keywords.ts`: normalization, exclusion, clustering, intent confidence, and metric aggregation.
- `scripts/lib/home-care-keywords.test.ts`: deterministic cleaning and grouping tests.
- `scripts/lib/home-care-ranking.ts`: competition classification, weighted scoring, ranking, and sensitivity analysis.
- `scripts/lib/home-care-ranking.test.ts`: ranking, saturation, incomplete evidence, and sensitivity tests.
- `scripts/lib/home-care-report.ts`: terminal-only rendering.
- `scripts/lib/home-care-report.test.ts`: output contract and warning tests.
- `scripts/research-home-care-niches.ts`: argument parsing, `.env` loading, confirmation, staged request orchestration, budget guard, and exit codes.
- `scripts/research-home-care-niches.test.ts`: orchestration with a fake client and no paid network traffic.
- `.env.example`: credential placeholders only.
- `package.json`: `tsx`, `dotenv`, and `research:niches` command.

---

### Task 1: DataForSEO client contract

**Files:**
- Create: `src/lib/server/dataforseo.ts`
- Create: `src/lib/server/dataforseo.test.ts`

**Interfaces:**
- Produces: `createDataForSeoClient(credentials, fetchImpl?)` returning `locations()`, `keywordIdeas(input)`, `searchVolume(input)`, `organicSerp(input)`, and `localFinder(input)`.
- Produces: `DataForSeoCall<T> = { data: T; costUsd: number }` and `DataForSeoError` with safe `kind`, `statusCode`, and `message` fields.

- [ ] **Step 1: Write failing authentication, task-error, and normalization tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createDataForSeoClient, DataForSeoError } from './dataforseo';

const ok = (result: unknown, cost = 0.01) =>
	new Response(JSON.stringify({ status_code: 20000, tasks: [{ status_code: 20000, cost, result }] }), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});

describe('createDataForSeoClient', () => {
	it('uses Basic auth and returns normalized cost', async () => {
		const fetchMock = vi.fn().mockResolvedValue(ok([{ location_code: 1, location_name: 'Hamilton,Ontario,Canada', location_type: 'City' }], 0.004));
		const client = createDataForSeoClient({ login: 'user', password: 'secret' }, fetchMock);
		const result = await client.locations();
		expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Authorization: `Basic ${btoa('user:secret')}` });
		expect(result.costUsd).toBe(0.004);
		expect(result.data[0].name).toBe('Hamilton,Ontario,Canada');
	});

	it('does not expose credentials in an HTTP error', async () => {
		const client = createDataForSeoClient({ login: 'user', password: 'secret' }, vi.fn().mockResolvedValue(new Response('denied', { status: 401 })));
		await expect(client.locations()).rejects.toMatchObject<DataForSeoError>({ kind: 'authentication', statusCode: 401 });
		await expect(client.locations()).rejects.not.toThrow(/user|secret/);
	});

	it('rejects a failed task inside HTTP 200', async () => {
		const body = { status_code: 20000, tasks: [{ status_code: 40501, status_message: 'Invalid Field', cost: 0 }] };
		const client = createDataForSeoClient({ login: 'u', password: 'p' }, vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })));
		await expect(client.locations()).rejects.toMatchObject({ kind: 'task', statusCode: 40501 });
	});
});
```

- [ ] **Step 2: Run the focused test and confirm the missing module failure**

Run: `pnpm vitest run src/lib/server/dataforseo.test.ts`

Expected: FAIL because `./dataforseo` does not exist.

- [ ] **Step 3: Implement the typed client and safe response parser**

```ts
const API = 'https://api.dataforseo.com/v3';

export type DataForSeoCall<T> = { data: T; costUsd: number };
export type DataForSeoCredentials = { login: string; password: string };
export type DfsLocation = { code: number; name: string; type: string };

export class DataForSeoError extends Error {
	constructor(
		public readonly kind: 'authentication' | 'http' | 'task' | 'response',
		public readonly statusCode: number | null,
		message: string
	) { super(message); }
}

export function createDataForSeoClient(credentials: DataForSeoCredentials, fetchImpl: typeof fetch = fetch) {
	const authorization = `Basic ${Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64')}`;

	async function request<T>(path: string, body?: unknown): Promise<DataForSeoCall<T>> {
		const response = await fetchImpl(`${API}${path}`, {
			method: body === undefined ? 'GET' : 'POST',
			headers: { Authorization: authorization, 'Content-Type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		if (!response.ok) throw new DataForSeoError(response.status === 401 ? 'authentication' : 'http', response.status, `DataForSEO HTTP ${response.status}`);
		const envelope = await response.json();
		const task = envelope?.tasks?.[0];
		if (!task || !Array.isArray(task.result)) throw new DataForSeoError('response', null, 'DataForSEO returned no usable task result');
		if (task.status_code !== 20000) throw new DataForSeoError('task', task.status_code ?? null, `DataForSEO task ${task.status_code ?? 'unknown'}: ${task.status_message ?? 'failed'}`);
		return { data: task.result as T, costUsd: Number(task.cost ?? 0) };
	}

	return {
		async locations(): Promise<DataForSeoCall<DfsLocation[]>> {
			const call = await request<Array<{ location_code: number; location_name: string; location_type: string }>>('/serp/google/locations');
			return { ...call, data: call.data.map((x) => ({ code: x.location_code, name: x.location_name, type: x.location_type })) };
		},
		keywordIdeas: (input: KeywordIdeasInput) => request<KeywordIdea[]>('/keywords_data/google_ads/keywords_for_keywords/live', [input]),
		searchVolume: (input: SearchVolumeInput) => request<KeywordMetric[]>('/keywords_data/google_ads/search_volume/live', [input]),
		organicSerp: (input: SerpInput) => request<SerpResult[]>('/serp/google/organic/live/advanced', [input]),
		localFinder: (input: SerpInput) => request<SerpResult[]>('/serp/google/local_finder/live/advanced', [input])
	};
}
```

Define the input and normalized result types in the same file; expose only fields consumed by later tasks: keyword, location, monthly volume/history, CPC/bids, competition, SERP item type/domain/title/rank, local title/rating/reviews/domain.

- [ ] **Step 4: Run client tests**

Run: `pnpm vitest run src/lib/server/dataforseo.test.ts`

Expected: PASS, including HTTP 401, task error, malformed response, endpoint path, normalized metric, and accumulated task cost cases.

- [ ] **Step 5: Commit the client**

```powershell
git add -- src/lib/server/dataforseo.ts src/lib/server/dataforseo.test.ts
git commit -m "feat: add safe DataForSEO client"
```

---

### Task 2: Candidate catalogue and keyword evidence

**Files:**
- Create: `scripts/lib/home-care-catalogue.ts`
- Create: `scripts/lib/home-care-keywords.ts`
- Create: `scripts/lib/home-care-keywords.test.ts`

**Interfaces:**
- Produces: `HOME_CARE_CANDIDATES: NicheCandidate[]` where ratings are explicit 0–100 values with rationales.
- Produces: `classifyKeyword`, `clusterKeywordMetrics`, and `summarizeDemand` for ranking.
- Consumes: normalized `KeywordMetric` and `KeywordIdea` types from Task 1.

- [ ] **Step 1: Write failing tests for exclusions, ambiguity, and duplicate intent**

```ts
describe('keyword evidence', () => {
	it.each(['caregiver jobs Hamilton', 'PSW course Burlington', 'what is dementia', 'free government respite'])('excludes non-buying query %s', (keyword) => {
		expect(classifyKeyword(keyword)).toMatchObject({ include: false });
	});

	it('discounts ambiguous live-in caregiver demand', () => {
		expect(classifyKeyword('live in caregiver')).toMatchObject({ include: true, confidence: 0.45 });
	});

	it('clusters reordered variants without summing both as unique buyers', () => {
		const clusters = clusterKeywordMetrics([
			metric('overnight care for elderly', 70),
			metric('elderly overnight care', 70)
		]);
		expect(clusters).toHaveLength(1);
		expect(clusters[0].adjustedVolume).toBe(70);
		expect(clusters[0].variants).toHaveLength(2);
	});
});
```

- [ ] **Step 2: Run the keyword tests and verify failure**

Run: `pnpm vitest run scripts/lib/home-care-keywords.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Add all fifteen controlled candidates with seed terms and rationales**

```ts
export type NicheCandidate = {
	id: string;
	label: string;
	seeds: string[];
	business: {
		recurrence: { score: number; rationale: string };
		ticketMargin: { score: number; rationale: string };
		operationalFeasibility: { score: number; rationale: string };
		regulatoryFeasibility: { score: number; rationale: string };
	};
};

export const HOME_CARE_CANDIDATES: NicheCandidate[] = [
	{ id: 'overnight', label: 'Overnight senior care', seeds: ['overnight care for elderly', 'overnight senior care'], business: { recurrence: rated(85, 'Repeat nights and weekend relief'), ticketMargin: rated(80, 'Long shifts reduce travel overhead'), operationalFeasibility: rated(60, 'Night staffing requires a reliable relief pool'), regulatoryFeasibility: rated(85, 'Non-clinical supervision is feasible with clear scope') } },
	{ id: 'post-acute', label: 'Post-acute recovery', seeds: ['post operative home care', 'post hospital home care', 'after surgery home care'], business: postAcuteRatings },
	{ id: 'memory', label: 'Dementia and memory care', seeds: ['dementia care at home', 'in home memory care', 'Alzheimer home care'], business: memoryRatings },
	{ id: 'neurological', label: 'Parkinson’s and neurological support', seeds: ['Parkinson care at home', 'neurological home care'], business: neurologicalRatings },
	{ id: 'respite', label: 'Caregiver respite', seeds: ['respite care for elderly', 'in home respite care'], business: respiteRatings },
	{ id: 'live-in', label: 'Live-in care', seeds: ['live in caregiver', 'live in senior care'], business: liveInRatings },
	{ id: 'companion', label: 'Companion care', seeds: ['senior companion care', 'companion for elderly'], business: companionRatings },
	{ id: 'escort', label: 'Medical appointment escort', seeds: ['medical appointment escort', 'senior appointment companion'], business: escortRatings },
	{ id: 'transport', label: 'Non-emergency medical transportation', seeds: ['medical transportation', 'non emergency medical transportation'], business: transportRatings },
	{ id: 'foot-care', label: 'Mobile senior foot care', seeds: ['mobile foot care', 'in home foot care for seniors'], business: footCareRatings },
	{ id: 'home-safety', label: 'Home safety assessment', seeds: ['senior home safety assessment', 'fall prevention home assessment'], business: homeSafetyRatings },
	{ id: 'meals', label: 'Senior meal support', seeds: ['meal preparation for seniors', 'senior meal delivery'], business: mealsRatings },
	{ id: 'care-management', label: 'Geriatric care management', seeds: ['geriatric care manager', 'elder care consultant'], business: careManagementRatings },
	{ id: 'medication', label: 'Medication reminders', seeds: ['medication reminder service for seniors', 'senior medication management'], business: medicationRatings },
	{ id: 'home-modifications', label: 'Aging-in-place home modifications', seeds: ['aging in place renovations', 'home modifications for seniors'], business: homeModificationRatings }
];
```

Define the named rating objects immediately above the array using these exact scores; every `rated()` call carries the rationale shown in the final column:

| ID | Recurrence | Ticket/margin | Operational | Regulatory | Rationale summary |
|---|---:|---:|---:|---:|---|
| post-acute | 55 | 85 | 65 | 65 | Short episode; premium package; scheduling is predictable; clinical scope needs escalation rules. |
| memory | 90 | 85 | 45 | 60 | Long-lived need and premium value; continuity/training are hard; non-clinical boundaries must be explicit. |
| neurological | 85 | 85 | 35 | 45 | Recurring complex care; specialist staff and regulated tasks make entry difficult. |
| respite | 75 | 70 | 70 | 85 | Repeat relief blocks; moderate price; ordinary non-clinical staffing is feasible. |
| live-in | 90 | 75 | 35 | 45 | Strong recurrence; labour coverage and employment compliance are difficult. |
| companion | 80 | 55 | 85 | 90 | Repeat visits and easy delivery, but commodity pricing limits margin. |
| escort | 55 | 60 | 75 | 80 | Repeat appointments; waiting time and vehicle/insurance obligations constrain margin. |
| transport | 65 | 45 | 45 | 50 | Repeat rides but vehicle utilization, insurance and accessible transport requirements are substantial. |
| foot-care | 90 | 75 | 55 | 40 | Predictable repeat cycle and good unit economics; qualified clinical personnel are required. |
| home-safety | 25 | 65 | 60 | 65 | Mostly one-off; assessment is sellable but professional boundaries and liability matter. |
| meals | 90 | 40 | 40 | 80 | Strong recurrence but food, delivery and waste compress margin. |
| care-management | 70 | 85 | 50 | 65 | Recurring coordination and premium advisory value; trust and professional credibility are barriers. |
| medication | 85 | 55 | 65 | 45 | Recurring service; reminders are feasible but administration/clinical claims are constrained. |
| home-modifications | 15 | 90 | 30 | 55 | High-ticket one-off projects; contractor operations and accessibility liability are complex. |

The implementation must enumerate all candidates from the design rather than generating categories from API suggestions.

- [ ] **Step 4: Implement deterministic filtering, token-signature clustering, and demand summaries**

```ts
export function classifyKeyword(keyword: string): KeywordClassification {
	const normalized = normalize(keyword);
	if (EXCLUDED_PATTERNS.some((pattern) => pattern.test(normalized))) return { include: false, confidence: 0, reason: 'non-commercial' };
	if (normalized === 'live in caregiver') return { include: true, confidence: 0.45, reason: 'mixed hiring, employment and immigration intent' };
	return { include: true, confidence: commercialConfidence(normalized), reason: 'commercial service intent' };
}

export function clusterKeywordMetrics(metrics: KeywordMetric[]): IntentCluster[] {
	const groups = new Map<string, KeywordMetric[]>();
	for (const metric of metrics) {
		const classification = classifyKeyword(metric.keyword);
		if (!classification.include) continue;
		const key = canonicalTokenSignature(metric.keyword);
		groups.set(key, [...(groups.get(key) ?? []), metric]);
	}
	return [...groups.values()].map(toIntentCluster);
}
```

Use the maximum volume among near-identical variants as the base cluster volume, then apply intent confidence. Keep city values separate and sum only Hamilton plus Burlington evidence.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm vitest run scripts/lib/home-care-keywords.test.ts`

Expected: PASS for all exclusions, all catalogue IDs, clustering, city separation, trend, CPC, and missing-value cases.

```powershell
git add -- scripts/lib/home-care-catalogue.ts scripts/lib/home-care-keywords.ts scripts/lib/home-care-keywords.test.ts
git commit -m "feat: model home care niche demand"
```

---

### Task 3: Competition, scoring, and sensitivity

**Files:**
- Create: `scripts/lib/home-care-ranking.ts`
- Create: `scripts/lib/home-care-ranking.test.ts`

**Interfaces:**
- Consumes: `NicheCandidate`, `IntentCluster`, and normalized SERP/local items.
- Produces: `rankNiches(evidence): RankedNiche[]`, `analyzeSensitivity(rankedInput): SensitivityResult`, and `classifyCompetition`.

- [ ] **Step 1: Write failing tests proving generic agencies differ from specialist saturation**

```ts
it('treats exact-match specialists as stronger saturation than generic agencies', () => {
	const generic = classifyCompetition(serps(['Bayshore Home Care', 'Home Instead']), 'mobile foot care');
	const specialists = classifyCompetition(serps(['Hamilton Mobile Foot Care', 'Burlington Foot Care Nurse']), 'mobile foot care');
	expect(specialists.opportunityScore).toBeLessThan(generic.opportunityScore);
});

it('uses the approved component weights', () => {
	const ranked = rankNiches([completeEvidence({ demand: 100, advertiserValue: 80, trend: 60, competitionOpportunity: 70, recurrence: 90, ticketMargin: 80, operationalFeasibility: 60, regulatoryFeasibility: 80 })]);
	expect(ranked[0].score).toBeCloseTo(80.5);
});

it('reports low confidence when reasonable weight changes flip the winner', () => {
	const result = analyzeSensitivity(twoCloseCandidates());
	expect(result.robust).toBe(false);
	expect(result.winnerShare).toBeLessThan(0.75);
});
```

- [ ] **Step 2: Run the ranking tests and verify failure**

Run: `pnpm vitest run scripts/lib/home-care-ranking.test.ts`

Expected: FAIL because `home-care-ranking.ts` does not exist.

- [ ] **Step 3: Implement explicit weighted scoring and incomplete-evidence confidence**

```ts
export const WEIGHTS = {
	demand: 0.25,
	advertiserValue: 0.15,
	trend: 0.10,
	competitionOpportunity: 0.15,
	recurrence: 0.10,
	ticketMargin: 0.10,
	operationalFeasibility: 0.10,
	regulatoryFeasibility: 0.05
} as const;

export function scoreComponents(c: ScoreComponents): number {
	return Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + c[key as keyof ScoreComponents] * weight, 0);
}
```

Normalize search-derived values across the candidate set with documented caps, keep missing values as missing rather than zero, and reduce confidence when required evidence is absent.

- [ ] **Step 4: Implement deterministic sensitivity scenarios**

Generate a fixed scenario set that moves each major weight ±25% and proportionally renormalizes the others. Mark a winner robust only when it remains first in at least 75% of scenarios and its base lead is at least three points.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm vitest run scripts/lib/home-care-ranking.test.ts`

Expected: PASS for weighting, generic-versus-specialist saturation, franchise/directory signals, missing evidence, and robust/non-robust winners.

```powershell
git add -- scripts/lib/home-care-ranking.ts scripts/lib/home-care-ranking.test.ts
git commit -m "feat: rank niche opportunity transparently"
```

---

### Task 4: Terminal report

**Files:**
- Create: `scripts/lib/home-care-report.ts`
- Create: `scripts/lib/home-care-report.test.ts`

**Interfaces:**
- Consumes: ranked niches, sensitivity result, warnings, cost, locations, and date range.
- Produces: `renderResearchReport(input): string` with no filesystem writes.

- [ ] **Step 1: Write the failing output-contract test**

```ts
it('prints evidence, counterargument, cost, confidence and market test', () => {
	const text = renderResearchReport(reportFixture());
	expect(text).toContain('RECOMMENDED STARTING SUBNICHE');
	expect(text).toContain('DataForSEO cost: USD 0.');
	expect(text).toContain('Strongest counterargument');
	expect(text).toContain('Sensitivity');
	expect(text).toContain('Minimal market test');
	expect(text).toContain('Hamilton');
	expect(text).toContain('Burlington');
});

it('does not force a winner when sensitivity is weak', () => {
	expect(renderResearchReport(lowConfidenceFixture())).toContain('No single robust winner');
});
```

- [ ] **Step 2: Run the report tests and verify failure**

Run: `pnpm vitest run scripts/lib/home-care-report.test.ts`

Expected: FAIL because the renderer does not exist.

- [ ] **Step 3: Implement a plain-text renderer with a compact fixed-width table**

```ts
export function renderResearchReport(input: ResearchReportInput): string {
	const lines = [
		`Market: Hamilton + Burlington | Language: English | Source: DataForSEO`,
		`DataForSEO cost: USD ${input.costUsd.toFixed(4)}`,
		'',
		renderRankingTable(input.ranked),
		'',
		input.sensitivity.robust ? `RECOMMENDED STARTING SUBNICHE: ${input.ranked[0].label}` : 'No single robust winner',
		renderEvidence(input),
		`Strongest counterargument: ${input.counterargument}`,
		`Sensitivity: ${renderSensitivity(input.sensitivity)}`,
		`Minimal market test: ${input.marketTest}`,
		renderWarnings(input.warnings)
	];
	return lines.filter((line) => line !== '').join('\n');
}
```

- [ ] **Step 4: Run tests and commit**

Run: `pnpm vitest run scripts/lib/home-care-report.test.ts`

Expected: PASS, including missing-data warnings and low-confidence wording.

```powershell
git add -- scripts/lib/home-care-report.ts scripts/lib/home-care-report.test.ts
git commit -m "feat: render niche research report"
```

---

### Task 5: Cost-bounded research orchestration

**Files:**
- Create: `scripts/research-home-care-niches.ts`
- Create: `scripts/research-home-care-niches.test.ts`
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**
- Consumes: all interfaces from Tasks 1–4.
- Produces: `runResearch(options, dependencies): Promise<ResearchRunResult>` for tests and `main()` for the CLI.

- [ ] **Step 1: Add `tsx` and `dotenv` and define the command**

Run: `pnpm add -D tsx dotenv`

Modify `package.json`:

```json
"research:niches": "tsx scripts/research-home-care-niches.ts"
```

Modify `.env.example`:

```dotenv
# DataForSEO API access: https://app.dataforseo.com/api-access
DATAFORSEO_LOGIN=your_dataforseo_api_login
DATAFORSEO_PASSWORD=your_dataforseo_api_password
```

- [ ] **Step 2: Write failing orchestration tests with a fake client**

```ts
it('stops optional SERP work before crossing the hard budget', async () => {
	const fake = fakeClient({ keywordCost: 0.08, serpCost: 0.05 });
	const result = await runResearch({ maxCostUsd: 0.10, confirmed: true }, dependencies(fake));
	expect(result.costUsd).toBe(0.08);
	expect(fake.organicSerp).not.toHaveBeenCalled();
	expect(result.warnings).toContainEqual(expect.stringMatching(/budget/i));
});

it('resolves exact Ontario city locations or fails before paid work', async () => {
	const fake = fakeClient({ locations: [{ code: 1, name: 'Hamilton,Ontario,Canada', type: 'City' }] });
	await expect(runResearch({ maxCostUsd: 1, confirmed: true }, dependencies(fake))).rejects.toThrow(/Burlington/);
	expect(fake.searchVolume).not.toHaveBeenCalled();
});

it('keeps a partial result and warning when one optional SERP fails', async () => {
	const result = await runResearch({ maxCostUsd: 1, confirmed: true }, dependencies(fakeClient({ failOneSerp: true })));
	expect(result.report).toContain('Warnings');
	expect(result.ranked.length).toBeGreaterThan(0);
});
```

- [ ] **Step 3: Run orchestration tests and verify failure**

Run: `pnpm vitest run scripts/research-home-care-niches.test.ts`

Expected: FAIL because the CLI module does not exist.

- [ ] **Step 4: Implement argument parsing, credentials, confirmation, staged calls, and hard budget**

```ts
import 'dotenv/config';

export const DEFAULT_MAX_COST_USD = 1;

export async function runResearch(options: RunOptions, deps: Dependencies): Promise<ResearchRunResult> {
	const ledger = createCostLedger(options.maxCostUsd);
	const locationsCall = await deps.client.locations();
	ledger.recordRequired(locationsCall.costUsd);
	const locations = resolveExactCities(locationsCall.data, ['Hamilton', 'Burlington']);
	const keywordEvidence = await collectKeywordEvidence(deps.client, locations, ledger);
	const shortlist = shortlistQueries(keywordEvidence, 2);
	const competition = await collectOptionalCompetition(deps.client, shortlist, locations, ledger);
	const ranked = rankNiches(buildEvidence(keywordEvidence, competition));
	const sensitivity = analyzeSensitivity(buildEvidence(keywordEvidence, competition));
	return buildRunResult(ranked, sensitivity, ledger, competition.warnings);
}
```

`main()` must:

- reject missing credentials before network access;
- accept only positive finite `--max-cost-usd` values;
- print the planned maximum calls and hard ceiling;
- ask `Proceed with the paid DataForSEO run? [y/N]`;
- treat anything except `y` or `yes` as cancellation;
- print the report and return exit code 0;
- print safe fatal errors and set exit code 1;
- never print the credential values.

- [ ] **Step 5: Run all feature tests**

Run: `pnpm vitest run src/lib/server/dataforseo.test.ts scripts/lib/home-care-keywords.test.ts scripts/lib/home-care-ranking.test.ts scripts/lib/home-care-report.test.ts scripts/research-home-care-niches.test.ts`

Expected: PASS with no real DataForSEO calls.

- [ ] **Step 6: Commit the integrated command**

```powershell
git add -- package.json pnpm-lock.yaml .env.example scripts/research-home-care-niches.ts scripts/research-home-care-niches.test.ts
git commit -m "feat: add cost bounded niche research command"
```

---

### Task 6: Live compatibility check and full research run

**Files:**
- Modify only if a real response exposes a documented contract mismatch: `src/lib/server/dataforseo.ts`, its test, or the relevant normalizer test.
- Do not commit `.env`.

**Interfaces:**
- Consumes: completed `pnpm research:niches` command.
- Produces: a terminal recommendation based on current DataForSEO evidence.

- [ ] **Step 1: Put credentials in ignored `.env` without echoing them**

The user enters the real API login after `DATAFORSEO_LOGIN=` and the real API password after `DATAFORSEO_PASSWORD=` directly in `C:\Users\pc02\projects\damian\.env`. Do not place either value in the plan, chat, command history, or terminal output.

Verify only presence, never values:

```powershell
$names = Get-Content .env | Where-Object { $_ -match '^DATAFORSEO_(LOGIN|PASSWORD)=' } | ForEach-Object { ($_ -split '=',2)[0] }
$names
```

Expected: exactly `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD`.

- [ ] **Step 2: Run the small live authentication/location compatibility check**

Run: `pnpm research:niches -- --check-auth`

Expected: safe success message naming the two resolved city locations, actual cost, and no keyword/SERP calls. If the API returns a different documented shape, first add a failing fixture test, then adjust only the response normalizer.

- [ ] **Step 3: Run repository verification before spending on the full study**

Run: `pnpm test`

Expected: PASS.

Run: `pnpm check`

Expected: no new errors beyond the two documented pre-existing errors in `src/routes/demo/paraglide` and `src/routes/tool/places-evaluator`.

- [ ] **Step 4: Run the full paid research after reviewing the displayed plan**

Run: `pnpm research:niches`

Expected: prompt showing request ceiling and USD 1.00 hard cap. Confirm only after checking the plan. Final output includes ranking, one robust recommendation or an explicit no-robust-winner result, evidence, warnings, actual cost, counterargument, sensitivity, and minimal market test.

- [ ] **Step 5: Record any measured contract correction in tests and commit only code**

```powershell
git status --short
git diff --check
git add -- src/lib/server/dataforseo.ts src/lib/server/dataforseo.test.ts scripts/lib/home-care-keywords.ts scripts/lib/home-care-keywords.test.ts scripts/lib/home-care-ranking.ts scripts/lib/home-care-ranking.test.ts scripts/lib/home-care-report.ts scripts/lib/home-care-report.test.ts scripts/research-home-care-niches.ts scripts/research-home-care-niches.test.ts
git commit -m "fix: align niche research with live DataForSEO responses"
```

Skip this commit if no compatibility correction was needed. Never stage `.env` or terminal output.

## Final verification checklist

- [ ] `git grep -n "DATAFORSEO_PASSWORD=" -- ':!.env.example'` finds no tracked credential.
- [ ] `pnpm test` passes.
- [ ] `pnpm check` introduces no new errors.
- [ ] The auth check resolves exact city-level Hamilton and Burlington records.
- [ ] The full run stays below the displayed hard ceiling.
- [ ] Actual API cost equals the sum of completed task costs.
- [ ] No report or raw response file was created.
- [ ] The result explains why the winner beats the runner-up and when that conclusion is not robust.
