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

---

## 4. Second Pass — the four remaining Candidates (2026-11-02)

> Same ticket, same component, same fixture. The first pass delivered 5 of the 9 `Candidate` verdicts; this pass closes the other 4.

### 4.1 Architecture Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Component | Extend `tests/components/api/AtcsApi.ts` (no new class) | Same endpoint, same resource; a second component would duplicate the route knowledge |
| Fixture | `{ api }` | Pure API contract, no browser |
| Credential handling | Set on the component by the test (`setAuthToken` / `clearAuthToken`), never a method parameter | Same convention as `OpenBugsApi.expectAccessDecision` (BK-1101) |
| PAT source | `AuthApi.mintScopedPat({ scopes: ['atc:write'] })` with `revoke()` in `finally` | Existing helper; `atc:write` is in the signin `pat_scopes` enum and is the only scope a write-only token needs |
| Test files | `parseAtcExpandQuery.test.ts` (BK-1376), `rejectAtcReadAccess.test.ts` (BK-1386, BK-1387), `readAtcNeverWrites.test.ts` (BK-1389) | Grouped by theme: parser, auth posture, side-effect freedom |
| Data strategy | Discover the same seed ATC (`06391422-2283-4688-995b-74f39f6cb564`) | All four TCs are read-only; zero writes, zero residue |

### 4.2 ATC Registry

| ATC ID | Component | Method | Description |
|--------|-----------|--------|-------------|
| BK-1376 | AtcsApi | `expectExpandParserApplied(args)` | `expand` normalisation (case, trim, empty, duplicates, repeated params) observed through which collections the payload carries |
| BK-1386 | AtcsApi | `expectReadRefusedForMissingCapability(atcId)` | 403 `forbidden` naming `atc:read` for a write-only PAT, error envelope only |
| BK-1387 | AtcsApi | `expectReadRefusedForAnonymousCaller(atcId)` | 401 `unauthorized` for no credential, error envelope only |
| BK-1389 | AtcsApi | `expectRepeatedReadsLeaveAtcUnchanged(atcId)` | Four reads (lean, expanded, lean, expanded) leave `version`, `updated_at` and step content untouched |

### 4.3 Per-ATC specs

`atc/BK-1376.md`, `atc/BK-1386.md`, `atc/BK-1387.md`, `atc/BK-1389.md` — same nine-section shape as the first pass.

### 4.4 Coverage note

With this pass, 9 of the 9 `Candidate` verdicts for BK-595 are automated. The story's remaining outlines (archived ATC, foreign workspace, precedence, latency, unsupported verbs, OpenAPI parity) stay at `READY` / deferred by the ROI verdict in `/test-documentation` — this pass does not reopen that decision.
