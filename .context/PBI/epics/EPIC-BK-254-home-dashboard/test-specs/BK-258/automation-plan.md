# Test Automation Plan: BK-258

> Ticket: BK-258 - TMS-Home | Show open bug count and severity breakdown
> Type: integration (BK-1100, BK-1101) + e2e (BK-1093)
> Sprint: not present in synced cache
> Created: 2026-10-06
> Scope: ticket-driven, first pass (3 of 7 Candidates)

## 1. Ticket Summary

- **What to test**: the workspace open-bugs read (`GET /api/v1/workspaces/{id}/open-bugs`) and the Home "Open bugs" card that renders it.
- **Acceptance Criteria** (synced `acceptance-criteria.md`):
  - AC1: workspace has open bugs across severities -> Home shows the total and the per-severity counts.
  - AC2: no open bug -> Home shows zero. (TC4, second pass.)
  - Refined by the ATP (BK-1107): "open" = `open` + `in_progress`; archived-module bugs excluded; zero state shows `0` + "Nothing outstanding right now." and no chips.
- **Dependencies**: none. BK-259 (Coverage card) renders in the same Home page, so selectors must stay scoped to `home-open-bugs*`.
- **First-pass TCs**: BK-1101 (TC9, authorization decision table), BK-1100 (TC8, API contract + cross-credential parity), BK-1093 (TC1, Home happy path with API oracle).

## 2. Architecture Decisions

### Component Strategy

| Decision | Value | Rationale |
|----------|-------|-----------|
| New API component | `OpenBugsApi` (`tests/components/api/OpenBugsApi.ts`), fixture key `openBugs` | One Api class per resource. TCs themselves say "open-bugs Api component". Owns BK-1100 and BK-1101 ATCs plus the `getOpenBugs` helper. Alternative considered: a `WorkspacesApi` shared with BK-256/257/259 (same Home family); rejected for now because those Stories have no automation scope yet (rename later is a mechanical change). |
| New API component | `BugsApi` (`tests/components/api/BugsApi.ts`), fixture key `bugs` | Setup-only helpers (no `@atc`): create a bug, advance its status. No Jira Test owns these writes (same precedent as `ProjectsApi.createProjectSuccessfully`). |
| Extended API component | `ProjectsApi` + `createModuleSuccessfully`, `archiveModuleSuccessfully` | Modules are created under `/projects/{id}/modules`; the existing class is already the "seed the hierarchy" helper surface. Avoids a fourth new class. |
| Extended API component | `AuthApi` + `mintScopedPat` helper | Signin already returns a PAT and accepts `pat_scopes`. Helper-only, no `@atc`. |
| New UI component | `HomePage` (`tests/components/ui/HomePage.ts`), fixture key `home` | Owns the Home route and the BK-1093 ATC; TC2 and TC4 add ATCs here in the second pass. |
| Fixture BK-1100, BK-1101 | `{ api }` | API only, no browser (Playwright fixtures are lazy). Runs in the `integration` project, whose fresh `request` context carries NO session cookie, which is what makes the credential matrix trustworthy. |
| Fixture BK-1093 | `{ test }` (hybrid) | API seeds and reads the oracle, UI verifies the card. The `e2e` project injects `storageState`, i.e. a browser session cookie. |
| Steps module | None | No chain repeats across 3+ ATCs or 3+ files yet. Seeding is three helper calls in the test. Promote to a `BugsSteps` class when TC2 and TC3 (second pass) repeat the project + module + bugs chain. |
| Test files | `tests/integration/home/readOpenBugsSummary.test.ts`, `tests/integration/home/rejectOpenBugsAccess.test.ts`, `tests/e2e/home/viewOpenBugsSummary.test.ts` | `{verb}{Feature}.test.ts`, folder = business module (`home`). |

> **ADR promotion check**: two decisions are cross-cutting and could become ADRs once reused: (a) credential isolation by minting PATs in a standalone `request.newContext()` so the test's own cookie jar stays clean; (b) hybrid e2e tests call `clearAuthToken()` so API setup and oracle reads use the same cookie identity the browser renders. Both are ticket-local today. Reassess at the second pass (TC2, TC4, TC7 make 4+ tickets-worth of reuse); if confirmed, promote to `.context/ADR/ADR-NNNN-<slug>.md`.

### [E2E ONLY] UI Elements (all inline in the ATC; none is used by 2+ ATCs in this pass)

| Element | Locator Strategy | Locator Value |
|---------|------------------|---------------|
| Card root | data-testid | `[data-testid="home-open-bugs"]` |
| Total | data-testid | `[data-testid="home-open-bugs-count"]` (can resolve to 2 elements while the Suspense placeholder is attached: wait for the skeleton first) |
| Chips container | data-testid | `[data-testid="home-open-bugs-severities"]` |
| Chip per severity | data-testid | `[data-testid="home-open-bugs-severity-P1"]` .. `P4` ; text pattern `P{n} {Critical|Major|Minor|Trivial} {count}` |
| Loading placeholder | data-testid | `[data-testid="home-open-bugs-skeleton"]` (assert `toHaveCount(0)` before reading) |

Locator style follows `ProjectsPage` (attribute CSS selectors, inline).

### [INTEGRATION ONLY] API Details

| Aspect | Value |
|--------|-------|
| Endpoint(s) | `GET /api/v1/workspaces/{id}/open-bugs` (ATCs + helper); seeding: `POST /api/v1/workspaces/{id}/projects`, `POST /api/v1/projects/{id}/modules`, `POST /api/v1/bugs`, `POST /api/v1/bugs/{id}/status`; cleanup: `DELETE /api/v1/modules/{id}`; PAT: `POST /api/v1/auth/signin` (with `pat_scopes`), `DELETE /api/v1/tokens/{id}` |
| OpenAPI Type(s) | `OpenBugs`, `OpenBugsBySeverity`, `BugStandaloneCreateBody`, `BugDetail`, `BugStatusTransitionBody`, `ModuleCreateBody`, `ModuleCreateResponse`, `ErrorEnvelope` via new facades `@schemas/workspace.types` (OpenBugs), `@schemas/bug.types` (create + status) and an addition to `@schemas/project.types` (modules). Barrel `api/schemas/index.ts` updated. `api/openapi-types.ts` already contains every one of these: **no `bun run api:sync` needed** |
| Auth Required | Yes. BK-1100: default login PAT, a minted `atc:read` PAT, cookie session. BK-1101: none, invalid bearer, PAT without `atc:read`, PAT with `atc:read`, cookie |
| Return Pattern | Tuple `[APIResponse, TBody]` (GET), `[APIResponse, TBody, TPayload]` (POST) via `ApiBase` |

## 3. ATC Registry

### Existing ATCs (Reuse)

| ATC ID | Component | Method | Description |
|--------|-----------|--------|-------------|
| BK-101 | AuthApi | `authenticateSuccessfully` | Used ONLY as the cookie-session precondition of one BK-1101 row and one BK-1100 row (signin sets the session cookie in the test's own context, then `clearAuthToken()` leaves cookie-only). Invoked from the test file, never from inside another ATC. It will log a BK-101 PASS entry; harmless noise, noted in Risks |

### New ATCs (Create)

| ATC ID | Component | Method | Description |
|--------|-----------|--------|-------------|
| BK-1101 | OpenBugsApi | `expectAccessDecision` | Decision-table ATC: given the credential currently set on the component, the open-bugs read returns the expected status/error. 5 data rows (3 denied, 2 allowed) |
| BK-1100 | OpenBugsApi | `expectOpenBugsContract` | 200 + body contract (`open_count` integer, `by_severity` exactly P1..P4 integers, `open_statuses` = `["open","in_progress"]`, `open_count` = sum). Called once per accepted credential (3 rows) |
| BK-1093 | HomePage | `showsOpenBugTotalWithSeverityBreakdown` | Home card total and the four chips equal the expected counts; total = sum of chips; labels correct. Returns the displayed counts for the API parity assertion |

All three ids are free in `kata-manifest.json` (checked 2026-10-06).

### New Helpers (No @atc)

| Component | Method | Returns | Description |
|-----------|--------|---------|-------------|
| OpenBugsApi | `getOpenBugs(workspaceId)` (`@step`) | `[APIResponse, OpenBugs]` | Plain read, no assertions. Baseline + parity oracle for BK-1093 (and every later Home UI TC) |
| AuthApi | `mintScopedPat(args: { scopes })` (`@step`) | `ScopedPat { token, id, scopes, revoke() }` | Signs in with `config.testUser` inside a standalone `request.newContext()` (own cookie jar), requesting `pat_scopes`, `pat_expires_in_days: 1` (self-expiring safety net) and a unique `pat_name`; asserts the returned scopes equal the requested ones; `revoke()` deletes the token with that context's session and disposes the context |
| ProjectsApi | `createModuleSuccessfully(args: { projectId, payload })` (`@step`) | `[APIResponse, ModuleCreateResponse]` | `POST /v1/projects/{id}/modules`, asserts 201 |
| ProjectsApi | `archiveModuleSuccessfully(moduleId)` (`@step`) | `[APIResponse, ModuleArchiveResponse]` | `DELETE /v1/modules/{id}`, asserts 200. Cleanup: archived-module bugs drop out of the open count, restoring the baseline |
| BugsApi | `createBugSuccessfully(payload)` (`@step`) | `[APIResponse, { bug }]` | `POST /v1/bugs` standalone body (`project_id`, `module_id`, `title` 5-200, `severity`), asserts 201 and `bug.status === 'open'` |
| BugsApi | `advanceBugStatusSuccessfully(args: { bugId, status })` (`@step`) | `[APIResponse, { bug }]` | `POST /v1/bugs/{id}/status`, asserts 200 and the new status. Forward-only, one stage per call, so `open -> in_progress` is one call |
| HomePage | `open()` (`@step`) | `void` | `page.goto('/home')` |

## 4. Test Data Strategy

### Classification (Discover > Modify > Generate)

| Ticket | Precondition | Pattern | Feasibility | Notes |
|--------|--------------|---------|-------------|-------|
| BK-1101 | Owner account + active workspace id | Discover | Feasible | `AuthApi.getCurrentUser()` -> `active_workspace_id`, credentials from `config.testUser` (`.env`) |
| BK-1101 | PAT without `atc:read`, PAT with `atc:read` | Generate | Feasible (spike S1 confirms `pat_scopes` is honored) | Minted per test in an isolated context with 1-day expiry, revoked in `finally` |
| BK-1101 | Invalid bearer string | Generate | Feasible | `faker.string.alphanumeric(32)`, never a real token |
| BK-1100 | Workspace the caller belongs to | Discover | Feasible | Same as above. No bug seeding: this TC asserts shape and cross-credential parity, not absolute numbers |
| BK-1100 | Three credentials | Discover (default PAT from `.auth/api-state.json`, preloaded by the `api` fixture) + Generate (minted PAT) + Generate (cookie via signin) | Feasible | Order matters: default PAT first, minted PAT second, cookie LAST (the signin that creates the cookie pollutes the test's jar) |
| BK-1093 | Baseline counts | Discover | Feasible | `OpenBugsApi.getOpenBugs` immediately before seeding; every assertion is a delta (shared workspace, observed baseline 4: P1 1, P2 2, P3 1, P4 0) |
| BK-1093 | Project, module, 5 bugs (P1 open, P2 open, P2 in_progress, P3 open, P4 in_progress) | Generate (+ Modify for the 2 `in_progress` bugs: create then `open -> in_progress`) | Feasible | Project via `ProjectsApi.createProjectSuccessfully` (exists), module and bugs via the new helpers. Bugs have no delete endpoint |

### Cleanup (a test that creates state owns its cleanup)

| Created by | Created entity | Cleanup | Residue |
|-----------|-----------------|---------|---------|
| BK-1101 / BK-1100 | Minted PATs, isolated contexts | `pat.revoke()` in `finally`; 1-day expiry if revoke fails | none |
| BK-1101 / BK-1100 | Cookie-bearing request context | disposed by Playwright at test end | none |
| BK-1093 | 5 bugs | `archiveModuleSuccessfully(moduleId)` in `finally`: archived-module bugs are excluded from the count, so the workspace returns to its baseline (same cleanup the Stage 2 ATR used) | 5 bugs stay in `open`/`in_progress` inside an archived module (invisible to the card) |
| BK-1093 | Module | archived (above) | archived module row |
| BK-1093 | Project | no delete/archive endpoint in the product | 1 project per run (`BK-258 QA <uniqueId>`), same residue pattern as BK-266. Mitigation for the second pass: Discover one QA project through `GET /v1/workspaces/{id}/recent-projects` before generating a new one |

Cleanup relies on the archived-module exclusion (AC1.b, BK-1095). If that rule ever regresses, BK-1093 would leave 5 live bugs behind AND BK-1095 would be the TC that fails; the `finally` also re-reads the oracle and logs a warning if the workspace did not return to its baseline.

### DataFactory additions (`tests/data/DataFactory.ts`) and types (`tests/data/types.ts`)

```ts
// types.ts
export interface TestModule { name: string, description?: string }
export interface TestBug { title: string, severity: 'P1' | 'P2' | 'P3' | 'P4', steps_to_reproduce?: string }
export interface OpenBugsCounts { total: number, P1: number, P2: number, P3: number, P4: number }

// DataFactory.ts
static createModule(overrides?: Partial<TestModule>): TestModule   // name: `BK258 Module ${uniqueId()}` (2-80 chars)
static createBug(overrides?: Partial<TestBug>): TestBug            // title: `[BK-258 QA] ${faker.lorem.words(4)}` (5-200 chars), severity P3 default
```

## 5. Test Scenarios

### File: `tests/integration/home/readOpenBugsSummary.test.ts`

Fixture: `{ api }`. Tag: `@regression` (High, not `@critical`: smoke stays small).

#### Scenario 1: BK-1100 contract and parity across credentials

Test: `BK-1100: should return open_count and by_severity with the same values when a workspace member calls the open-bugs API with each accepted credential`
Preconditions: workspace id from `api.auth.getCurrentUser()` (default PAT).
Rows (Examples: Accepted credentials), executed in this order:
1. Default login PAT: already set by the `api` fixture -> `expectOpenBugsContract(workspaceId)`.
2. Minted `atc:read` PAT: `mintScopedPat({ scopes: ['atc:read'] })`, `api.setAuthToken(pat.token)` -> `expectOpenBugsContract(workspaceId)`.
3. Cookie session: `api.auth.authenticateSuccessfully(config.testUser)` then `api.clearAuthToken()` -> `expectOpenBugsContract(workspaceId)`.
ATCs called: `BK-1100` x3.
Test-level assertions: the three bodies are deep-equal (same `open_count`, `by_severity`, `open_statuses`); `by_severity` keys are exactly `P1..P4`.
Teardown: `pat.revoke()` in `finally`.

### File: `tests/integration/home/rejectOpenBugsAccess.test.ts`

Fixture: `{ api }`. Tag: `@critical` (ROI 6.3, security; cheap, belongs in smoke-api). One Playwright `test()` per Examples row (rows are a data array, same `@atc('BK-1101')`), so every row gets its own fresh `request` context and a cookie from one row can never leak into another.

| Row | Credential set on the component | Expected |
|-----|--------------------------------|----------|
| 1 | `api.clearAuthToken()` (fresh context: no cookie, no header) | 401 `unauthorized` |
| 2 | `api.setAuthToken(<random string>)` | 401 `unauthorized` |
| 3 | `api.setAuthToken(patNoAtcRead.token)` (`mintScopedPat({ scopes: ['run:execute'] })`) | 403, message contains `atc:read` |
| 4 | `api.setAuthToken(patAtcRead.token)` (`mintScopedPat({ scopes: ['atc:read'] })`) | 200 |
| 5 | `api.auth.authenticateSuccessfully(config.testUser)` then `api.clearAuthToken()` (cookie only) | 200 |

Test names: `BK-1101: should respond {status} when the open-bugs read is called with {credential}`.
Preconditions per row: workspace id resolved FIRST with the preloaded default PAT (`getCurrentUser()`), then the row's credential replaces it.
ATCs called: `BK-1101` once per row.
Test-level assertions: none beyond the ATC (the table lives in the data array).
Teardown: `pat.revoke()` in `finally` for rows 3 and 4.

### File: `tests/e2e/home/viewOpenBugsSummary.test.ts`

Fixture: `{ test: fixture }`. Tag: `@critical`.

#### Scenario 1: BK-1093 total and P1-P4 breakdown

Test: `BK-1093: should show the open bug total with a P1-P4 breakdown that sums to it given open bugs at several severities`
Preconditions (inside the test, all through `fixture.api`):
1. `fixture.clearAuthToken()` so every API call uses the session cookie, the same identity the browser renders (guarantees the same "active workspace").
2. `workspaceId` from `getCurrentUser()`; `baseline = getOpenBugs(workspaceId)`.
3. Generate: project, module, 5 bugs (P1 open, P2 open, P2 in_progress, P3 open, P4 in_progress; the two `in_progress` ones via `advanceBugStatusSuccessfully`).
Action: `ui.home.open()`.
ATC: `ui.home.showsOpenBugTotalWithSeverityBreakdown(expected)` with `expected = { total: base+5, P1: base+1, P2: base+2, P3: base+1, P4: base+1 }` (computed in the test from the baseline).
Test-level assertions: `getOpenBugs(workspaceId)` after the ATC returns exactly the counts the ATC read off the card (`open_count`, all four `by_severity` values).
Teardown: `finally { archiveModuleSuccessfully(moduleId) }` plus baseline re-read (log only).

## 6. Implementation Order (one commit per step)

- [ ] Step 0, SPIKES (no commit; results appended to `progress.md`, see section 8): S1 `pat_scopes` honored, S2 403 error code and message, S3 cookie vs bearer precedence and workspace consistency, S4 revoke path
- [ ] Add facades `api/schemas/workspace.types.ts`, `api/schemas/bug.types.ts`; extend `project.types.ts`; update `api/schemas/index.ts`
- [ ] Add types and factory methods to `tests/data/types.ts`, `tests/data/DataFactory.ts`
- [ ] `AuthApi.mintScopedPat` helper
- [ ] `OpenBugsApi` (helper + BK-1100 + BK-1101 ATCs); register in `ApiFixture` (property + `setAuthToken`/`clearAuthToken` propagation lines)
- [ ] `tests/integration/home/readOpenBugsSummary.test.ts`, then `rejectOpenBugsAccess.test.ts`; run `bun run test <file>`
- [ ] `ProjectsApi` module helpers + `BugsApi`; register `bugs` in `ApiFixture`
- [ ] `HomePage` (`open` + BK-1093 ATC); register `home` in `UiFixture`
- [ ] `tests/e2e/home/viewOpenBugsSummary.test.ts`; run it (needs `bun run pw:install` first)
- [ ] `bun run types:check`, `bun run lint:check`, `bun run kata:manifest`, `git add kata-manifest.json`, `bun run kata:manifest:check`
- [ ] TMS: `start_automation` transition before Code for BK-1093, BK-1100, BK-1101; `create_pr` on PR open (never "Automated" locally; that is the post-merge `merged` transition); link each TC to its automated test (`test_automation` link type) and flip labels at `merged` only

## 7. Success Criteria

- [ ] AC floor: AC1 covered by BK-1093 (+ BK-1100 as oracle). **Risk-beyond-AC covered in this pass**: authorization (BK-1101, decision table), contract and cross-credential parity (BK-1100). AC2 and the status/archive/isolation rules are second-pass Candidates, not silently dropped (section 9)
- [ ] BVA: N/A in this pass (no range/limit); count boundaries 0 and 1 are TC4 (second pass) and TC5 (Deferred)
- [ ] KATA compliance: no ATC calls an ATC, max 2 positional params, inline locators, aliases only
- [ ] Fixture correct: `{ api }` for the two integration files (no browser), `{ test }` for the e2e file
- [ ] No hardcoded waits (skeleton detach, web-first assertions only); no hardcoded credentials, ids or tokens
- [ ] Tests pass locally against staging, zero retries; workspace baseline restored after BK-1093
- [ ] `@atc` ids match the real Candidate keys (BK-1093, BK-1100, BK-1101), none a placeholder

## 8. Phase 2 spikes (resolve before writing ATC bodies; each is one read or one tiny write on staging with cleanup)

| # | Question | How | Decides |
|---|----------|-----|---------|
| S1 | Does `POST /auth/signin` with `pat_scopes: ['run:execute']` return a PAT with exactly that scope, and does `GET open-bugs` with it return 403? | One signin + one GET in a scratch script, revoke after | `mintScopedPat` design; if ignored, fall back to `POST /tokens` through the isolated context's session cookie |
| S2 | Exact 403 `error.code` and `message` | Same call as S1 | Row 3 expectation: plan assumes `forbidden` + message containing `atc:read` (Stage 2 observed the message; the code is inferred from the `ErrorEnvelope` enum) |
| S3 | When both a session cookie and a bearer are present, which wins? Does `/me` under cookie return the workspace the Home card renders? | Cookie-only vs bearer-only `GET /me` | Confirms the "cookie last / fresh context per row" ordering (needed whatever the answer) and the `clearAuthToken()` rule for hybrid tests |
| S4 | Can the PAT itself revoke (`DELETE /tokens/{id}` with the bearer), or only the cookie session? | One revoke attempt | `ScopedPat.revoke()` implementation (plan assumes the isolated context's cookie session) |

## 9. Deferred to the second pass (not in this approval)

| TC | Key | What it will reuse | What it adds |
|----|-----|--------------------|--------------|
| TC2 | BK-1094 | `getOpenBugs`, `BugsApi`, module helpers, `HomePage.open` | An EP Scenario Outline (open, in_progress, resolved, closed): a P3 bug advanced forward to each status (resolved and closed take 2 and 3 calls) and a HomePage ATC asserting total and P3 chip deltas. Likely the moment to introduce a `BugsSteps` class (project + module + bug chain repeats in TC1, TC2, TC3) |
| TC4 | BK-1096 | `getOpenBugs` (all-zero oracle), `HomePage` | Empty-state ATC (`home-open-bugs-count` = 0, `home-open-bugs-empty` text, `home-open-bugs-severities` absent). Needs a **fixture workspace**: Discover-or-Generate through `GET /v1/workspaces` / `POST /v1/workspaces` (constant name, e.g. "BK-258 QA Fixture"), activated for the browser session with `POST /v1/me/active-workspace` (cookie only; PATs cannot switch workspace). 3 data rows (no bugs, only resolved/closed, only archived-module) |
| TC3, TC7 | BK-1095, BK-1099 | Same scaffolding | Archive-exclusion (extra DELETE module step) and active-workspace isolation (second workspace). Also second pass |
| Not automated | BK-1097, BK-1098, BK-1102, BK-1103, BK-1104, BK-1105 | n/a | Deferred verdicts from Stage 4 (terminal for automation) |

> Superseded: the BK-1102 deferral in this section is lifted at the requester's direction; the canonical plan is `atc/BK-1102.md` plus the `## Regression pass (BK-1102)` section of `spec.md`.
