# Test Automation Plan: BK-595

> Ticket: BK-595 - TMS-ATC API | Read a single ATC by id
> Type: API integration (`{ api }` fixture)
> Created: 2026-10-31
> Scope: ticket-driven, high-ROI first pass (`BK-1368`, `BK-1374`, `BK-1377`, `BK-1378`, `BK-1379`).

## 1. Architecture Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| New schema facade | `api/schemas/atc.types.ts` (re-exported in `api/schemas/index.ts`) | Typed contracts for `AtcHeader`, `AtcStepItem`, `AtcAssertionItem`, `AtcAcceptanceCriterionItem`, `AtcUsedInItem`, `AtcResource`, `AtcGetResponse`. |
| New API component | `tests/components/api/AtcsApi.ts`, registered as `readonly atcs: AtcsApi` on `ApiFixture` | Follows `OpenBugsApi` / `TraceabilityApi` conventions. |
| Fixture | `{ api }` | Pure API contract and negative validation; no browser needed. |
| Test files | `tests/integration/atcs/readAtcById.test.ts` (`BK-1368`, `BK-1374`) and `tests/integration/atcs/rejectInvalidAtcRead.test.ts` (`BK-1377`, `BK-1378`, `BK-1379`) | Grouped by positive read contract vs negative validation/non-disclosure. |
| Data strategy | Discover (`FIXTURE_ATC_ID = '06391422-2283-4688-995b-74f39f6cb564'`) | Existing ATC in the staging QA workspace carrying steps, assertions, and acceptance criteria; zero writes, zero residue. |

## 2. ATC Registry

| ATC ID | Component | Method | Description |
|--------|-----------|--------|-------------|
| BK-1368 | AtcsApi | `expectLeanAtcRead(atcId)` | GET `/v1/atcs/{id}` -> 200, `Cache-Control: private, no-store`, header fields present, expansion keys absent. |
| BK-1374 | AtcsApi | `expectExpandedAtcRead(atcId)` | GET `/v1/atcs/{id}?expand=steps,assertions,acceptance_criteria,used_in` -> 200, all 4 arrays present and ordered, matching single-expansion reads. |
| BK-1377 | AtcsApi | `expectInvalidExpandRejected(args)` | GET `/v1/atcs/{id}?expand=...` with unknown token -> 400 `bad_request`, `details.reason === 'expand_invalid'`, no `atc` key. |
| BK-1378 | AtcsApi | `expectAtcNotFound(atcId)` | GET `/v1/atcs/{id}` for non-existent UUID -> 404 `not_found`, `details.reason === 'not_found'`, only `['error']` top-level key. |
| BK-1379 | AtcsApi | `expectMalformedAtcIdRejected(malformedId)` | GET `/v1/atcs/{id}` for malformed UUID -> 400 `bad_request`, message matches `/atc id must be a uuid/i`, only `['error']` top-level key. |

## 3. Per-ATC specs

Each ATC above has its own contract document under `atc/` (`atc/BK-1368.md`, `atc/BK-1374.md`, `atc/BK-1377.md`, `atc/BK-1378.md`, `atc/BK-1379.md`): objective, fixed-vs-test-level assertion split, endpoint evidence from the shipped route, technique derivation (EP / BVA / pairwise reduction) and the data context with its cleanup.
