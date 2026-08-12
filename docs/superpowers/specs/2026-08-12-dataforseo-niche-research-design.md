# DataForSEO Home-Care Niche Research Design

## Objective

Build an internal command-line research tool that uses DataForSEO to identify the home-care subniche with the best probability of success in the Hamilton–Burlington corridor. The command must produce its conclusion in the terminal, explain the evidence behind the ranking, and avoid exposing credentials or creating a public endpoint.

The tool supports a business decision. Search demand is one input, not the decision by itself. The ranking must also account for commercial intent, local competition, repeat business, likely ticket size, operational difficulty, and regulatory risk.

## Scope

The first version will:

- run locally through `pnpm research:niches`;
- use English Google searches in Hamilton and Burlington, Ontario;
- evaluate a controlled catalogue of home-care and adjacent senior-service subniches;
- expand seed keywords, retrieve Google Ads metrics, and inspect local and organic search results;
- remove employment, education, public-service, informational, and residential-care noise;
- print a ranked comparison and one recommended starting subniche;
- show the API cost reported by DataForSEO;
- require confirmation before a full paid run unless explicitly invoked in a non-interactive CI/test mode with mocked data.

The first version will not:

- expose a web page or public API;
- persist reports, raw API responses, or credentials;
- launch or modify advertising campaigns;
- estimate a full financial model from search data alone;
- use an opaque model to choose the winner;
- support arbitrary industries or geographies.

## Credentials and security

DataForSEO uses HTTP Basic authentication with an API login and API password. Local credentials will be supplied through:

- `DATAFORSEO_LOGIN`
- `DATAFORSEO_PASSWORD`

Both variables will be documented with placeholders in `.env.example` and stored with real values only in the ignored `.env` file. The client will read them from the private server environment. It will never return, log, serialize, or interpolate them into errors.

The command will fail before making a request if either variable is missing. Authentication errors will identify the failing service and status without printing response headers or request authorization data.

## Architecture

### DataForSEO client

`src/lib/server/dataforseo.ts` will own all DataForSEO HTTP communication. It will provide small typed operations for:

- resolving Google location records;
- expanding keywords from seed phrases;
- retrieving Google Ads search volume, monthly history, CPC, and competition;
- retrieving Google organic SERPs;
- retrieving Google Local Finder results.

The client will use DataForSEO v3 Live endpoints. It will validate both HTTP responses and DataForSEO task-level status codes, because a successful HTTP response can still contain a failed task. Every operation will return normalized data plus the cost reported by the API.

No feature-specific file will call DataForSEO directly. This keeps authentication, error parsing, cost accounting, and response-shape handling in one module.

### Research domain

`scripts/lib/home-care-niches.ts` will contain the pure research logic:

- the controlled subniche catalogue;
- seed keywords and exclusion vocabulary;
- normalization and semantic grouping;
- commercial-intent classification;
- metric aggregation;
- local-competition analysis;
- scoring and ranking;
- terminal report construction.

Keeping this logic independent from HTTP allows deterministic tests using fixtures.

### Command

`scripts/research-home-care-niches.ts` will orchestrate the run and own terminal interaction. A package script named `research:niches` will invoke it with `tsx`, added as a development dependency.

The command will:

1. validate configuration and credentials;
2. resolve the two target locations;
3. display the planned request count and maximum configured spend;
4. ask for confirmation;
5. collect and normalize keyword metrics;
6. shortlist commercial queries for each subniche;
7. inspect organic and local competition only for the shortlist;
8. score the candidates;
9. print the result and actual API cost.

## Candidate catalogue

The initial catalogue will include:

- overnight senior care;
- post-acute and post-operative recovery;
- dementia and memory care;
- Parkinson's and neurological support;
- caregiver respite;
- live-in care;
- companion care;
- medical appointment escort;
- non-emergency medical transportation;
- mobile senior foot care;
- home safety and fall-prevention assessment;
- senior meal preparation or delivery;
- geriatric care management;
- medication reminders;
- aging-in-place home modifications.

Each candidate will define its own seed phrases and operational metadata. The catalogue is deliberately controlled: API suggestions may expand how people search for a candidate but may not silently create a new business category. Unexpected clusters can be printed under “opportunities to review” without entering the winner calculation until deliberately classified.

## Data collection

### Locations

The tool will resolve exact DataForSEO Google locations for Hamilton and Burlington rather than hard-code unverified codes. It will require unambiguous city-level matches in Ontario, Canada. If either location cannot be resolved exactly, the run stops before paid keyword or SERP requests.

### Keyword metrics

The tool will use the current Google Ads Search Volume Live endpoint. Requests will be batched within the documented API limit. For each keyword and location it will collect:

- average monthly search volume;
- monthly search history when available;
- CPC;
- paid competition and competition index;
- low and high top-of-page bid when available.

Hamilton and Burlington will be retained separately long enough to detect meaningful geographic differences, then combined for corridor-level ranking.

### Query cleaning and grouping

Keywords will be normalized for case, punctuation, minor word-order variants, and near-identical intent. Closely equivalent phrases will form an intent cluster; their displayed evidence will include the constituent variants, but the scoring method will prevent treating every variant as a completely independent buyer.

The tool will exclude or separately label queries dominated by:

- jobs, salaries, careers, immigration, LMIA, or sponsorship;
- courses, certification, or training;
- definitions, symptoms, and general health information;
- government-funded services or benefit navigation;
- nursing homes, retirement residences, or facility placement when the candidate is in-home care;
- brand-only navigational searches;
- irrelevant meanings of ambiguous phrases.

Ambiguous high-volume terms such as `live in caregiver` will receive a reduced intent-confidence factor unless the expanded queries and SERPs demonstrate consumer hiring intent.

### SERP and local competition

SERP calls are the cost-control bottleneck and will run only for the leading commercial query clusters of each candidate. The first version will inspect no more than two queries per candidate per city unless the configured cap explicitly allows more.

The analysis will record:

- presence and size of a local pack;
- number of relevant local providers in the returned Local Finder depth;
- franchise or large-chain prevalence;
- repeated domains across commercial queries;
- directory dominance;
- exact-match specialist providers versus general home-care pages;
- paid results and other SERP features when returned.

Competition is not simply the number of results. A niche dominated by a few generic agencies may be more penetrable than one containing many strongly reviewed exact-match specialists.

## Decision model

The score will be explicit and decomposable. Each candidate receives normalized component scores on a 0–100 scale:

- 25% commercial search demand;
- 15% advertiser value, using CPC and bid evidence;
- 10% recent demand trend;
- 15% competitive opportunity, inversely related to specialist saturation;
- 10% expected recurrence;
- 10% expected ticket and gross-margin potential;
- 10% operational feasibility for a new entrant;
- 5% regulatory feasibility.

Search-derived factors represent 65% of the total. Business-model factors represent 35% and come from explicit catalogue values with written rationales. This prevents a low-ticket transport term from winning only because it has more searches, while still allowing DataForSEO evidence to drive most of the result.

The report must show every component. It will also run sensitivity checks by recalculating the ranking with each major component varied within a documented range. A winner will be called “robust” only if it remains first across most reasonable weight variations. Otherwise, the output will say that the data does not support a single confident winner and identify the decision that requires field validation.

## Terminal output

The command will print:

1. market, date range, locations, and data sources;
2. total actual DataForSEO cost;
3. a compact ranking table;
4. the recommended starting subniche;
5. the commercial query clusters supporting it;
6. the local-competition evidence;
7. the operational and regulatory reasons affecting the score;
8. the strongest counterargument;
9. sensitivity/confidence status;
10. a suggested minimal market test.

It will not write JSON, CSV, Markdown, or raw response files. Tests may contain curated fixtures that do not include credentials or private account data.

## Cost controls

The command will have a default maximum cost of USD 1.00, exposed as a named configuration value rather than scattered literals. A `--max-cost-usd` argument may lower or raise that ceiling explicitly for a run. This is a hard spending ceiling, not a prediction that every run will consume it.

Before paid collection, the command will print:

- number of keyword requests;
- maximum possible SERP and Local Finder requests;
- configured maximum spend;
- whether this is a small authentication check or the full research run.

The user must confirm the full run. The client will accumulate the `cost` field returned by every completed task and stop scheduling new optional SERP work when the remaining budget is insufficient. Required location and keyword work has priority over optional competitor depth.

No automatic retry will repeat a chargeable request unless the failure is known to have produced no billable task. Ambiguous failures will be reported for manual review.

## Error handling

Fatal errors:

- missing credentials;
- failed authentication;
- ambiguous or missing target locations;
- malformed DataForSEO responses;
- no usable keyword data across all candidates;
- budget too small for the required first stage.

Recoverable errors:

- a rejected or unavailable keyword;
- a missing metric for one phrase;
- an empty local result for one query;
- one optional SERP task failure;
- reaching the optional competition-analysis budget.

Recoverable errors will appear in a warnings section and reduce confidence where relevant. They will never be converted silently to zero demand or zero competition.

## Verification

Automated tests will cover:

- Basic Auth construction without snapshotting secrets;
- HTTP and task-level API error parsing;
- cost accumulation and budget enforcement;
- exact location selection;
- keyword exclusion and intent grouping;
- duplicate-intent volume treatment;
- competition classification from representative SERP items;
- component scoring and deterministic ranking;
- sensitivity analysis;
- terminal output when evidence is incomplete.

The client tests will mock `fetch`; they will not consume API credit. Before the full run, a deliberately small live authentication/location request will verify credentials and response compatibility. The full research run will proceed only after its estimated request plan is displayed and confirmed.

Repository verification will include the relevant test suite and `pnpm check`, interpreted under the project's documented rule that the two pre-existing type-check errors do not count as regressions.

## Success criteria

The integration is complete when:

- credentials remain private and absent from git history and logs;
- one command performs the complete Hamilton–Burlington comparison;
- actual API cost and partial failures are visible;
- equivalent keywords are not naively summed as independent demand;
- local specialist saturation affects the ranking;
- the winning recommendation is traceable to displayed evidence;
- tests prove ranking, filtering, errors, and cost limits deterministically;
- the command can honestly report low confidence instead of forcing a winner.
