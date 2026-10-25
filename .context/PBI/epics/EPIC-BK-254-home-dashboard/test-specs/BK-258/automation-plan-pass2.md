# Test Automation Plan: BK-258 (second pass)

> Ticket: BK-258 - TMS-Home | Show open bug count and severity breakdown
> Type: e2e hybrid (UI + API oracle), both TCs
> Created: 2026-10-06
> Scope: ticket-driven, second pass. Candidates BK-1094 (TC2) and BK-1096 (TC4). BK-1095 (TC3) and BK-1099 (TC7) are NOT in this pass.
> First pass (merged, PR #22): `automation-plan.md` (BK-1093, BK-1100, BK-1101). Not rewritten.

## 0. Worth automating? (per-TC gate, applied BEFORE any design work)

Constraint from the user: do not automate what is not worth it. Each TC is judged on marginal cost now, value protected that the already-automated BK-1093 / BK-1100 / BK-1101 do not protect, and a recommendation.

### BK-1094 (TC2): status counting rule

| Dimension | Assessment |
|-----------|------------|
| Marginal cost | LOW. Reuses unchanged: `OpenBugsApi.getOpenBugs`, `BugsApi` (create, advance), `ProjectsApi` (module create/archive), `HomePage.open`, DataFactory, fixtures. New: 1 `HomePage` ATC (~25 lines), 1 test file (4 data rows), 1 small Discover helper in `ProjectsApi`. No new spike that blocks (one read-only discover check, D1). Runtime: ~10 writes per resolved/closed row, 4 UI loads, about 30-40 s for the file. Residue: 4 bugs in 4 archived modules per run (invisible to the card), 0 new projects when D1 passes (reuse the existing "BK258 QA Open Bugs" project). Flake risk: same as BK-1093 (shared workspace baseline 4, `workers: 1`; a concurrent session filing a bug between baseline read and card render would break a delta). |
| Value protected beyond pass 1 | REAL but narrow. BK-1093 already proves `open` and `in_progress` ARE counted (its 5 bugs include two `in_progress`, total = base+5). Nothing automated proves `resolved` and `closed` are EXCLUDED, and the open predicate is `HOME_OPEN_BUG_STATUSES = ['open','in_progress']`: a regression that adds `resolved` to it is a silent over-count on the headline number (TC: Critical, ROI 1.6, "silent data-integrity error"). The two counted rows are kept as controls: without a +1 control a "+0" row can pass vacuously when seeding silently fails. |
| Recommendation | **AUTOMATE** (all 4 rows, one ATC, one parameterized test). |

### BK-1096 (TC4): zero state

| Dimension | Assessment |
|-----------|------------|
| Marginal cost | HIGH as authored, LOW as a reduced slice. As authored (3 rows): needs an isolated workspace with zero open bugs. The shared workspace (baseline 4) cannot be used. Row 1 ("workspace has no bugs") is only literally true in a never-seeded workspace, so it needs a SECOND constant workspace (create via `POST /v1/workspaces`, slug is global so a 409 against another tenant is possible, no delete endpoint = permanent residue). Rows 2 and 3 seed bugs into the fixture workspace: 3-6 writes each, bugs can never be deleted (permanent residue grows every run), and row 3 creates a transient OPEN bug in an active module, which forces serial execution against row 2 and any other reader of that workspace. Plus a new `WorkspacesApi` or equivalent, a browser-side workspace switch (cookie jar of the `request` fixture is NOT the browser's, see S-W1), 4 spikes (W1-W4). Estimate: about 2.5x the code and 3x the staging writes of BK-1094, and 2 permanent workspaces. As a reduced slice (zero-state render against the EXISTING "BK-258 QA Fixture" workspace, Discover only): reuse `AuthApi.getCurrentUser` (its `workspaces[]` already lists workspaces, so no `WorkspacesApi`), 1 `HomePage` ATC, 1 helper that activates the workspace for the browser, 1 test, 0 creates, 0 residue, 2 spikes (W1, W2). Flake risk: low (isolated workspace), but the precondition (zero open bugs) is only guaranteed while nobody leaves an open bug there; the test checks it first and fails with a clear message. |
| Value protected beyond pass 1 | REAL and unique. AC2 ("no open bug -> zero") has NO automated coverage today (BK-1093 is AC1 only, and the card hides the chips and shows a different message in this state, so it is a separate render branch). A wrong zero state is a "false all-clear". The three Examples rows differ only in WHY the count is 0; the render branch is the same, and the reasons are predicate rules owned elsewhere: resolved/closed exclusion by BK-1094, archived-module exclusion by BK-1095 (still a Candidate, can be automated later at about the cost of one BK-1094 row). Rows 2 and 3 therefore add predicate coverage already bought by other TCs, at the highest cost of the scope. |
| Recommendation | **SPLIT**. (a) AUTOMATE the reduced slice (render of the zero state against the existing fixture workspace), conditional on spike W1 (browser can be pointed at the fixture workspace without UI-switcher scaffolding) and W2 (the empty-state test ids render). (b) KEEP MANUAL rows 2 and 3 (and row 1's "never had a bug" nuance); they stay covered by the Stage 2 ATR evidence (all three rows PASSED, screenshots in the Story evidence folder). If W1 fails and the only path is a UI workspace-switcher flow with unknown locators, downgrade the whole TC to **KEEP MANUAL**. This is a change to the TC's authored scope: it needs the user's approval and a Jira note on BK-1096 (not written in this phase). |

### Outcome of the gate

| TC | Verdict | Scope in this plan |
|----|---------|--------------------|
| BK-1094 | AUTOMATE | 4 rows, full |
| BK-1096 | SPLIT | reduced slice automated if W1 and W2 pass; rows 2 and 3 manual; a plan automating only BK-1094 is a fully valid outcome |

BK-1094 alone is a complete deliverable. TC4 can be dropped without affecting it (no shared code is added only for TC4 except one `HomePage` ATC and one helper).

## 1. Ticket Summary

- **What to test**: the Home "Open bugs" card counting rule (which statuses count) and its zero state.
- **Acceptance Criteria**: AC1.a refined status rule ("open" = `open` + `in_progress`), AC2 zero state (`0` + "Nothing outstanding right now.", no chips).
- **Dependencies**: none. Selectors stay scoped to `home-open-bugs*` (BK-259 Coverage card shares the page).
- **Second-pass TCs**: BK-1094 (TC2, EP, Critical, ROI 1.6), BK-1096 (TC4, BVA count=0 + EP cause, Critical, ROI 1.2).
- **Known facts reused**: `.env` pins `TEST_ENV=local`, run with `TEST_ENV=staging`; a bearer wins over a session cookie; a PAT cannot switch the active workspace (cookie only, `POST /v1/me/active-workspace` returns 403 for PATs); bug status is forward-only one stage per call; archived-module bugs are excluded; shared workspace baseline open_count 4 (P1 1, P2 2, P3 1, P4 0).

## 2. Architecture Decisions

### Component Strategy

| Decision | Value | Rationale |
|----------|-------|-----------|
| Reused unchanged | `OpenBugsApi` (`getOpenBugs`), `BugsApi` (`createBugSuccessfully`, `advanceBugStatusSuccessfully`), `ProjectsApi` (`createModuleSuccessfully`, `archiveModuleSuccessfully`, `createProjectSuccessfully`), `AuthApi.getCurrentUser`, `HomePage.open`, `ApiFixture`, `UiFixture`, `DataFactory.createModule/createBug`, types `OpenBugsCounts`, schemas | Anti-duplication (`kata-manifest.json`: 11 components, 44 ATCs, `steps: []`, ids BK-1094 and BK-1096 free). |
| Extended | `HomePage` + ATC `BK-1094` `showsCountedBugTotalAndMinorChip`; + ATC `BK-1096` `showsNothingOutstandingWithoutSeverityChips` (only if W1 and W2 pass) + private `waitForCardSettled()` + `@step selectWorkspace` (only for BK-1096) | One page object per route. The private wait helper removes the skeleton wait duplicated between ATCs (a private method is not an ATC, so "ATCs never call ATCs" is respected). |
| Extended | `ProjectsApi` + `findProjectByName(args: { workspaceId, name })` Discover helper (`@step`, no `@atc`) over `GET /v1/workspaces/{id}/recent-projects?limit=20` | Discover > Generate. Avoids 4 new projects per run. Fallback when not found: `createProjectSuccessfully` (exists). Needs spike D1. |
| NOT created | `WorkspacesApi` | The first plan deferred it. Decision: still not justified. Discovery reuses `getCurrentUser().workspaces[]`; the only new call (`POST /v1/me/active-workspace`) must land in the BROWSER cookie jar, so it lives as a UI-side step on `HomePage`, not in an Api class (an Api class would write the `request` fixture's jar, not the page's). Create/list helpers would be single-use and the creation path is dropped by the gate. Revisit when BK-1099 (TC7, two workspaces) is planned: that is the first TC that genuinely needs workspace creation. |
| NOT created | `BugsSteps` (Steps class) | Rule (kata-architecture section 8): same 3+ ATC chain in 3+ test files. Here the repeated chain is 3 HELPER calls (module, bug, advance), not ATCs, in 2 new files at most (BK-1094 plus pass-1 BK-1093, which is not refactored), and BK-1096's reduced slice seeds nothing. Seeding is a 6-line private function in the BK-1094 test file. Reassess when BK-1095 (archive row) or BK-1098 land: the first time a third file repeats `module -> bug -> advance`, extract `tests/components/steps/BugsSteps.ts` (the directory does not exist yet; `ExampleSteps.ts` cited in the doctrine is also absent, so the first Steps class would also define the pattern). |
| Fixture | `{ test }` (hybrid) for both | TC Architecture field: "E2E (UI + API oracle), hybrid fixture `{ test }`". |
| Test files | `tests/e2e/home/viewOpenBugsStatusRule.test.ts` (BK-1094), `tests/e2e/home/viewOpenBugsZeroState.test.ts` (BK-1096 slice) | `{verb}{Feature}.test.ts`, folder = business module (`home`). Two files because the preconditions are disjoint (shared workspace vs fixture workspace). |

TC level: BK-1094 UI + API per the TC's own Architecture and Gherkin (card values + `open_statuses` + `open_count == card total`). An API-only variant would drop the real card-vs-server render risk (the card calls `countOpenBugs` server side, not the REST route) and is therefore not substituted. BK-1096: UI + API oracle likewise.

ADR check: the two ticket-local decisions flagged in pass 1 (cookie-identity hybrid, isolated credentials) are reused here unchanged; BK-1096 adds a third (browser workspace selection through the cookie, never through a PAT). Three tickets of reuse is the threshold: recommend recording `ADR-NNNN-hybrid-e2e-identity-and-workspace-selection` AFTER code, only if W1 passes. Not written now.

### [E2E ONLY] UI Elements (inline in the ATCs)

| Element | Locator | Used by |
|---------|---------|---------|
| Skeleton | `[data-testid="home-open-bugs-skeleton"]` (`toHaveCount(0)` first) | both ATCs (via the private wait) |
| Total | `[data-testid="home-open-bugs-count"]` | both |
| P3 chip | `[data-testid="home-open-bugs-severity-P3"]`, text `P3 Minor {n}` | BK-1094 |
| Empty message | `[data-testid="home-open-bugs-empty"]`, text "Nothing outstanding right now." | BK-1096 |
| Chips container | `[data-testid="home-open-bugs-severities"]` (must be absent, `toHaveCount(0)`) | BK-1096 |

Locator style follows pass 1 (CSS attribute selectors inline; the skeleton locator appears in the private wait and in no other place, so no extraction beyond it).

### [API] Details

| Aspect | Value |
|--------|-------|
| Endpoints | read `GET /api/v1/workspaces/{id}/open-bugs` (explicit workspace id, valid under bearer or cookie; a PAT can read other workspaces of the same user by design, ADR-0006); seed `POST /v1/projects/{id}/modules`, `POST /v1/bugs`, `POST /v1/bugs/{id}/status`; cleanup `DELETE /v1/modules/{id}`; Discover `GET /v1/workspaces/{id}/recent-projects?limit=20`, `GET /v1/me`; BK-1096 only: `POST /v1/me/active-workspace` (body `{ workspace_id }`, cookie session only) |
| Types | all present in `api/openapi-types.ts` and the existing facades (`RecentProjects`, `MeResponse`, `ActiveWorkspaceBody` need a facade export only if the helper is typed by them). No `bun run api:sync` |

## 3. ATC Registry

### Existing ATCs (reuse, not called from other ATCs)

| ATC ID | Component | Use |
|--------|-----------|-----|
| (none) | | Pass-1 ATCs BK-1093 / BK-1100 / BK-1101 stay as they are. BK-1093's ATC asserts four chips visible, which is the wrong shape for a count of 0 or for a delta-only check, so it is NOT reused for these TCs (each Jira TC owns one `@atc`). |

### New ATCs

| ATC ID | Component | Method | Description |
|--------|-----------|--------|-------------|
| BK-1094 | HomePage | `showsCountedBugTotalAndMinorChip(expected: { total: number, P3: number })` | Card total and P3 chip equal the expected values after the skeleton is gone; one param object. Data-driven over 4 Examples rows (open +1, in_progress +1, resolved +0, closed +0). |
| BK-1096 | HomePage | `showsNothingOutstandingWithoutSeverityChips()` | Total reads `0`, the empty message is shown, the chips container is not rendered. Conditional on W1 and W2. |

### New Helpers (No @atc)

| Component | Method | Description |
|-----------|--------|-------------|
| ProjectsApi | `findProjectByName(args: { workspaceId, name })` (`@step`) | Returns the project id or `null` (silent, utility style). |
| HomePage | `selectWorkspace(workspaceId)` (`@step`, BK-1096 only) | Points the BROWSER at the workspace through the `bk_active_ws` cookie; mechanism decided by spike W1. |

## 4. Test Data Strategy

### Classification (Discover > Modify > Generate)

| TC | Precondition | Pattern | Feasibility | Notes |
|----|--------------|---------|-------------|-------|
| BK-1094 | Owner, active workspace id | Discover | Feasible | `clearAuthToken()` then `getCurrentUser()` (cookie identity = browser identity, as pass 1) |
| BK-1094 | Baseline total + P3 | Discover | Feasible | `getOpenBugs` right before each row's seeding. Guard: `baseline.open_count >= 1`, otherwise a +0 row would render the zero state and the P3 chip would not exist; fail loud with a message naming the precondition |
| BK-1094 | QA project | Discover (`findProjectByName`, constant name `BK258 QA Open Bugs`, already on staging, id cd77f3ee... in the ATR) else Generate | Feasible pending D1 | One project ever instead of one per run |
| BK-1094 | Module (active) | Generate | Feasible | per row, `createModule()` |
| BK-1094 | P3 bug at status X | Generate + Modify | Feasible | create (`open`) then 0, 1, 2 or 3 forward `advanceBugStatusSuccessfully` calls |
| BK-1096 | Fixture workspace "BK-258 QA Fixture" (id 6fdd4771-e08a-4305-8723-1aec994d568a on staging, not hardcoded: resolved by name from `me.workspaces`) | Discover only | Feasible pending W1; if absent the test fails with a message (no creation inside the test) | Created once during Stage 2, holds only archived modules, no open bug |
| BK-1096 | Zero open bugs | Discover | Feasible | precondition check `getOpenBugs(fixtureId).open_count === 0` first; failure message says which bug state to repair manually |

### Cleanup (a test that creates state owns its cleanup)

| Created by | Entity | Cleanup | Residue |
|-----------|--------|---------|---------|
| BK-1094 (each row) | module + 1 bug | `archiveModuleSuccessfully(moduleId)` in `finally`, wrapped in try/catch that warns and never masks the failure (pass-1 pattern); baseline re-read logged | 1 bug per row in an archived module, invisible to the card. Note: for the `open` and `in_progress` rows the baseline is restored only through the archived-module exclusion (BK-1095 rule, not yet automated); a regression there leaves live bugs and BK-1095 (manual) would be the TC that catches it |
| BK-1094 | project | none created when D1 passes | 0 (else 1 once) |
| BK-1096 slice | nothing created | none | none. Browser cookie lives in the per-test browser context built from `storageState`, discarded at test end; the storageState file is never re-saved |

### Data types / factory

No additions. `createModule`, `createBug`, `OpenBugsCounts` from pass 1 are enough. The fixture workspace name constant is defined once at the top of the BK-1096 test file.

## 5. Test Scenarios

### File: `tests/e2e/home/viewOpenBugsStatusRule.test.ts`

Fixture `{ test: fixture }`. Tag `@critical`, `@regression`. Rows as a data array, one Playwright `test()` per row (fresh browser context and request jar per row), same `@atc('BK-1094')`. `workers: 1` and `fullyParallel: false` already serialize rows.

| Row | Partition | Moves P3 bug to | Advance calls | Expected total / P3 vs baseline |
|-----|-----------|-----------------|---------------|---------------------------------|
| 1 | counted | `open` | 0 | +1 / +1 |
| 2 | counted | `in_progress` | 1 | +1 / +1 |
| 3 | excluded | `resolved` | 2 | +0 / +0 |
| 4 | excluded | `closed` | 3 | +0 / +0 |

Test name: `BK-1094: should {count|exclude} a P3 bug in status {status} in the Home open bugs total`.
Flow per row: `clearAuthToken()`; workspace id; `baseline = getOpenBugs`; guard `open_count >= 1`; discover/generate project; module; P3 bug advanced to the row status; `ui.home.open()`; ATC with `expected = { total: base.open_count + delta, P3: base.by_severity.P3 + delta }`; test-level: `getOpenBugs` again, `open_statuses` equals `['open','in_progress']`, `open_count` equals the card total, `by_severity.P3` equals the chip. `finally`: archive module.
Boundary note: count BVA 0 and 1 is not applicable to this TC's partitions; they belong to BK-1096 (0, slice) and BK-1097 (exactly one, TC5, Deferred).

### File: `tests/e2e/home/viewOpenBugsZeroState.test.ts` (conditional on W1, W2)

Fixture `{ test: fixture }`. Tag `@regression` (not `@critical`: staging-fixture dependent).
Test: `BK-1096: should show 0 and the Nothing outstanding message without severity chips given a workspace with no open bug`.
Flow: `clearAuthToken()`; `me = getCurrentUser()`; fixture workspace id by name from `me.workspaces` (fail with message if absent); `getOpenBugs(fixtureId)` precondition `open_count === 0`; `ui.home.selectWorkspace(fixtureId)`; `ui.home.open()`; ATC `showsNothingOutstandingWithoutSeverityChips`; test-level: oracle `open_count 0` and `by_severity` all `0`. No teardown (nothing written).
BVA (count = 0) is the point of this TC: stated explicitly. Count = 1 stays in BK-1097 (Deferred).

## 6. Implementation Order (one commit per step; after approval only)

- [ ] Step 0, SPIKES (no commit; results appended to `progress.md`): D1 (BK-1094), W1, W2 (BK-1096 slice), see section 8
- [ ] `ProjectsApi.findProjectByName`
- [ ] `HomePage`: private `waitForCardSettled()` (pass-1 ATC left byte-identical in behavior; refactor only if the manifest and BK-1093 stay green, otherwise duplicate the two lines, do not touch BK-1093), ATC `BK-1094`
- [ ] `tests/e2e/home/viewOpenBugsStatusRule.test.ts`; run on staging (`TEST_ENV=staging`), baseline re-read after
- [ ] BK-1096 slice only if W1 and W2 passed: `HomePage.selectWorkspace` + ATC `BK-1096` + test file; otherwise stop and record KEEP MANUAL
- [ ] `bun run types:check`, `bun run lint:check`, `bun run kata:manifest`, `git add kata-manifest.json`, `bun run kata:manifest:check`
- [ ] TMS (per lifecycle used in pass 1): `start_automation` before Code for each automated TC, `create_pr` on PR open, `merged` + label flips post-merge. A TC kept manual is NOT transitioned and gets no label change.

## 7. Success Criteria

- [ ] AC floor: AC1.a status rule (BK-1094) and AC2 render branch (BK-1096 slice). Risk-beyond-AC: excluded-status regression on the headline number; false all-clear
- [ ] KATA: no ATC calls an ATC (private wait helper is not an ATC); max 2 positional params (both ATCs <= 1); inline locators; aliases only
- [ ] Fixture `{ test }` for both files (browser needed)
- [ ] No hardcoded waits, credentials, ids, tokens or workspace ids
- [ ] Green on staging with zero retries; baseline open_count 4 (P1 1, P2 2, P3 1, P4 0) restored after BK-1094
- [ ] `@atc` ids are the real keys (BK-1094, BK-1096)

### Test-Design Checklist (doctrine Part 3)

```
[x] P1  Beyond "every AC passes": BK-1094 adds the excluded-status risk the AC text does not name; BK-1096 is the AC2 floor
[x] P2  AC = floor: AC1 floor is BK-1093, this pass adds the rule above it
[x] P3  Each case is a concrete exploration (status x delta, fixture state), not an AC restatement
[x] P4  AC1 -> TC1/TC2/TC3/TC7/TC8 each its own case, not collapsed. AC2 -> TC4 reduced (rows 2 and 3 deliberately left manual, justified in section 0: same render branch, cause predicates owned by BK-1094 and BK-1095)
[x] P5  Risk outside the criterion: transient state of the shared workspace, vacuous +0 (controlled by the +1 rows and the baseline >= 1 guard)
[x] EP   Statuses: counted {open, in_progress}, excluded {resolved, closed}. All four members run because the outline is cheap and the two counted rows are the controls. No EP merge across partitions
[x] BVA  Count 0 (BK-1096 slice) and count 1 (BK-1097, Deferred, stated); N/A for BK-1094 (deltas, no limit)
[x] BVA-D N/A: raw integers
[x] ST   Forward-only transitions used to reach each status (open -> in_progress -> resolved -> closed); the lifecycle itself is BK-1098 (Deferred); backward 422 not re-tested here
[x] DT   N/A: one factor
[x] PW   N/A: fewer than 3 factors
[x] PARAM BK-1094: 4 rows -> ONE ATC and one parameterized test, kept 4 rows (EP members of two distinct partitions, none mergeable across them; within the excluded partition resolved and closed are kept because they are distinct states reached by different write counts and a predicate bug can treat them differently)
[x] RISK Ordered by ROI; BK-1096 rows 2 and 3 dropped from automation explicitly, not silently
[x] OBS  Preconditions reachable: BK-1094 yes; BK-1096 slice yes if W1 passes, else Deferred/manual
```

## 8. Spikes (read-only GETs allowed now; none executed in this planning phase)

| # | Question | How | Decides |
|---|----------|-----|---------|
| D1 | Is the existing project "BK258 QA Open Bugs" within `recent-projects?limit=20` of the shared workspace, and does the name match exactly? | One read-only GET with the default PAT | Discover vs Generate for the project; if absent or ranked out, `findProjectByName` falls back to `createProjectSuccessfully` once and accepts 1 project of residue |
| W1 | How can the BROWSER be pointed at the fixture workspace? (a) `page.request.post('/api/v1/me/active-workspace')` (shares the browser context's jar), (b) `context.addCookies` for `bk_active_ws` (httpOnly, domain from `baseUrl`), (c) the UI workspace switcher. Also confirm the `request` fixture's jar is separate from the page's | One scratch script in `.session/test-automation/BK-258/` using a throwaway context; cookie session only, PAT returns 403 (known) | `selectWorkspace` design; if only (c) works and its locators are unknown, BK-1096 becomes KEEP MANUAL |
| W2 | Does the Home card in the fixture workspace render `home-open-bugs-empty` with the exact text, and is `home-open-bugs-severities` absent while the skeleton is gone? | Same script, one navigation, read-only | ATC locators and message pinned |
| W3 (optional, only if the gate verdict is overridden to full TC4) | Can the test user create a workspace, and is a constant slug globally unique (409 across tenants)? | Not run. Would be a write with permanent residue, so it needs explicit user approval | Needed only for the "never-seeded" row 1 |

## 9. Risks and open questions for the user

| Item | Note |
|------|------|
| TC4 scope change | Automating only the slice changes BK-1096's authored scope (3 rows). Needs approval and a Jira comment (not written here). |
| BK-1094 shared baseline | A concurrent session filing or closing a bug between baseline and render produces a false failure. Same exposure as BK-1093; accepted, zero retries. |
| BK-1094 cleanup | Count restoration depends on the archived-module exclusion (BK-1095 still manual). |
| Fixture workspace drift | If anyone leaves an open bug in "BK-258 QA Fixture" the BK-1096 slice fails by design with a precondition message, never a false pass. |
| Pass-1 refactor | `waitForCardSettled` could be shared with BK-1093; plan keeps BK-1093 untouched unless trivially safe. |
| ADR | Promote after code if W1 passes (section 2). |

## 10. Still deferred

| TC | Key | Status |
|----|-----|--------|
| TC3 | BK-1095 | Candidate, next in line (archive exclusion; would make BK-1094 cleanup self-verifying) |
| TC7 | BK-1099 | Candidate; first TC that needs two workspaces, revisit `WorkspacesApi` then |
| BK-1096 rows 2 and 3 | | Manual (Stage 2 evidence), see section 0 |
| TC5, TC6, TC10-TC13 | BK-1097, BK-1098, BK-1102..BK-1105 | Deferred in pass 1 |

> Superseded: the BK-1102 deferral in this section is lifted at the requester's direction; the canonical plan is `atc/BK-1102.md` plus the `## Regression pass (BK-1102)` section of `spec.md`.
