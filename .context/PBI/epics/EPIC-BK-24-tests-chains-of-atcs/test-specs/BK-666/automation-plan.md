# Test Automation Plan: BK-666

> Ticket: BK-666, TMS-Test List, browse, filter and sort every Test in a Project
> Type: e2e (UI with API seeding, `{ test }` fixture for every ATC)
> Sprint: not recorded in the synced Story. Stage 2 ran 2026-11-05
> Created: 2026-11-05
> Companion files: `spec.md`, `atc/BK-1560.md` … `atc/BK-1578.md`

## 1. Ticket Summary

- **What to test**: the Project Tests list as a surface of its own. Reachability from the sub-nav, Project scoping (also through the tag filter), the four row fields, the shared tag filter and its `N of M` count, the distinct no-match state, Name sort ascending then reversed, and the row-to-detail navigation.
- **Acceptance Criteria** (Story AC-01 to AC-11, the eight automated TCs cover AC-01, AC-03, AC-04, AC-05, AC-06, AC-07, AC-09): see `spec.md`.
- **Dependencies**: BK-620 (Project scoping, merged 2026-11-01).

## 2. Architecture Decisions

### Component Strategy

| Decision | Value | Rationale |
|----------|-------|-----------|
| Component (UI) | **NEW** `ProjectTestsPage` (`tests/components/ui/ProjectTestsPage.ts`) | One surface, one page object. Covers the sub-nav entry too, because AC-01 is about the Tests section of the Project (see "Why one UI component" below) |
| Component (API) | **NEW** `TestsApi` (`tests/components/api/TestsApi.ts`), helpers-only, no `@atc` | The Tests resource has no write component yet. Its three writes here are setup for the list, not outcomes under test: `POST /v1/tests`, `PUT /v1/tests/{id}/tags`, and the ATC chain they reference. Same pattern as `ProjectsApi` (`createProjectSuccessfully` has no `@atc`) |
| Reused, no change | `ProjectsApi.createWorkspaceSuccessfully`, `createProjectSuccessfully`, `createModuleSuccessfully` | Already seed Workspace → Project → Module with fail-fast 201 asserts |
| Reused, no change | `ProjectsPage.selectWorkspace` (via `ui.projects`) | Sets the `bk_active_ws` cookie the list renders against. Must run before any UI call |
| Fixture (all 8 ATCs) | `{ test }` | Every test seeds through the API and then drives the browser (the same hybrid shape as `listProjectsInIndex.test.ts`). `{ ui }` alone cannot seed, and `{ api }` alone opens no page |
| Test file | `tests/e2e/tests/browseProjectTests.test.ts` | Mirrors `tests/e2e/projects/listProjectsInIndex.test.ts`. The folder is named after the TMS resource. (Alternative: `tests/e2e/project-tests/`. Open question Q2) |
| Preconditions | Inline in each test, via `api.tests.seedTestWithChainSuccessfully` | One composition method, not a Steps module. A Steps class has to re-implement HTTP because it extends `TestContext`, not `ApiBase`, and the chain is used from one file only (Steps rule: 3+ files) |

### Why one UI component
A second component (for example `ProjectSubNav`) would split one surface across two files for 1 of 8 ATCs. The sub-nav lives in the Project shell, but the ATC asserts what the Tests section does. If the sub-nav grows its own ATCs later, it gets its own component then (max 15–20 ATCs per component, this one holds 8).

### [E2E ONLY] UI Elements

Source of truth for these testids: `.session/.archive/2026-11-05-sprint-testing-BK-666/evidence/stage2-verdicts-complete.json` (live DOM observed during Stage 2). **The local `upex-bunkai-tms` checkout does not contain the list page** (`tests/page.tsx` is absent on `origin/staging`, last commit 2026-10-25). The list was verified live, not from source. Every locator below is re-checked against the live DOM in Phase 2 before it is trusted.

| Element | Locator Strategy | Locator Value | Status |
|---------|------------------|---------------|--------|
| Sub-nav Tests entry | testid | `[data-testid="project-subnav-tests"]` | Live-confirmed (TC-01) |
| List root | testid | `[data-testid="tests-list"]` | Live-confirmed |
| Count copy | testid | `[data-testid="tests-list-count"]` | Live-confirmed |
| Table | testid | `[data-testid="tests-list-table"]` | Live-confirmed |
| Row | testid prefix | `[data-testid^="tests-list-row-"]`, exact `tests-list-row-<testId>` | Live-confirmed |
| Row open control | testid | `[data-testid="tests-list-open-<testId>"]` | Live-confirmed (TC-19) |
| Sort headers | testid | `tests-list-sort-name`, `tests-list-sort-chain`, `tests-list-sort-created` | Live-confirmed |
| Tag filter input | testid | `[data-testid="test-tag-filter"]` | Live-confirmed (shared with the explorer) |
| Empty (never) state | testid | `[data-testid="tests-list-empty"]`, copy `No Tests yet` | Live-confirmed |
| No-match state | text + role | copy `No Test carries this tag`, action role button `Clear` | **Open**: testid of the state and of Clear unknown (Q6) |
| Tags cell | column position | 3rd cell of the row, header `Tags`; untagged shows `—` | **Open**: no testid (Q8) |
| Created cell | column position | 4th cell of the row, header `Created`, format `YYYY-MM-DD` | Format live-confirmed; UTC rule from the Gherkin (Q9) |
| Test detail chain | text | Test title and chain ATC title on `/projects/{slug}/tests/{testId}` | **Open**: heading testid (Q7). Route exists in the checkout at `tests/[testId]/page.tsx` |

### [INTEGRATION ONLY] API Details (seeding endpoints)

| Aspect | Value |
|--------|-------|
| Workspace | `POST /api/v1/workspaces` (existing: `ProjectsApi.createWorkspaceSuccessfully`) |
| Project | `POST /api/v1/workspaces/{id}/projects` (existing: `ProjectsApi.createProjectSuccessfully`) |
| Module | `POST /api/v1/projects/{id}/modules` (existing: `ProjectsApi.createModuleSuccessfully`) |
| User Story (new helper) | `POST /api/v1/modules/{id}/user-stories`, body `{ title: 3-200 }`. Route exists (`app/api/v1/modules/[id]/user-stories/route.ts`, POST exported). Success code to confirm against OpenAPI (Q10) |
| Acceptance Criterion (new helper) | `POST /api/v1/user-stories/{id}/acceptance-criteria`, body `{ title: 3-200 }`, returns **201**. Route exports POST |
| ATC (new helper) | `POST /api/v1/atcs`, body `{ module_id, user_story_id, title 3-200, layer 'UI'\|'API'\|'Unit', steps: [{position:1, content}] min 1, acceptance_criterion_ids: [uuid] min 1 }`. Must be created in the same Project as the Module, or the server refuses it |
| Test (new helper) | `POST /api/v1/tests`, body `{ title 1-200, atc_ids [uuid] min 1, workspace_id }`, **201**, `Idempotency-Key` required (`^[\w-]{8,128}$`). Response `{ test: { id, workspace_id, title, created_by, created_at, steps } }` |
| Tags (new helper) | `PUT /api/v1/tests/{id}/tags`, body `{ tags: string[] }` (replaces the set; reserved tags lowercased), **200** |
| Auth | Cookie session. `clearAuthToken()` before the first call so `page.request` carries the session. Every test passes `workspace_id` explicitly, so the cookie is not the only source of truth |
| OpenAPI types | Shapes exist in `api/openapi-types.ts` (path keys confirmed for all 5 endpoints). Facades to add: see §3 |

### Architecture of the helper component
`TestsApi` is a Layer 3 component (extends `ApiBase`). Its six methods are all `@step`, none is `@atc`:

| Method | Returns | Purpose |
|--------|---------|---------|
| `createUserStorySuccessfully` | `[APIResponse, CreateUserStoryResponse]` | Story to host the chain's ATCs |
| `createAcceptanceCriterionSuccessfully` | `[APIResponse, CreateAcceptanceCriterionResponse]` | AC an ATC must anchor to (`acceptance_criterion_ids` min 1) |
| `createAtcSuccessfully` | `[APIResponse, CreateAtcResponse]` | One ATC of the chain, inside the Module's Project |
| `createTestSuccessfully` | `[APIResponse, CreateTestResponse]` | `POST /v1/tests` with `Idempotency-Key`, asserts 201 |
| `setTestTagsSuccessfully` | `[APIResponse, SetTestTagsResponse]` | `PUT /v1/tests/{id}/tags`, asserts 200 |
| `seedTestWithChainSuccessfully` | `[APIResponse, CreateTestResponse]` | Composition: story → AC → N ATCs → Test → tags. The only method the tests call |

Note: `seedTestWithChainSuccessfully` takes an object param (`{ workspaceId, moduleId, title, chainLength, tags? }`), so the two-positional limit holds.

### Architecture of the UI component
`ProjectTestsPage` (Layer 3, extends `UiBase`), in this order: constructor → navigation (`open(slug)`, `@step`) → helpers (private `rowFor`, `sortHeader`, `renderedTitles`) → 8 ATCs.

## 3. ATC Registry

### Existing ATCs (Reuse)
None. The manifest has no `@atc` on a Tests surface and none of the eight TC keys (BK-1560, BK-1562, BK-1566, BK-1569, BK-1570, BK-1573, BK-1574, BK-1578) is taken. Verified against `kata-manifest.json` (generated 2026-11-02).

### New ATCs (Create)

| ATC ID | Component | Method | Description |
|--------|-----------|--------|-------------|
| BK-1560 | ProjectTestsPage | `openFromSubNavMarksTestsCurrent(slug)` | Project overview → sub-nav Tests → URL is `/projects/{slug}/tests`, the entry carries `aria-current="page"`, the list renders |
| BK-1562 | ProjectTestsPage | `listsOnlyCurrentProjectTests(scope)` | The list shows its own titles and none of the foreign titles |
| BK-1566 | ProjectTestsPage | `rowsShowNameChainCountTagsAndCreatedDay(rows)` | Headers Name, Chain, Tags, Created; each row shows the title, `N ATCs` / `1 ATC`, its tags or `—`, and the UTC day |
| BK-1569 | ProjectTestsPage | `tagFilterNarrowsListAndStatesCount(args)` | The shared tag input narrows to the matching titles; count reads `N of M Tests carry <tag>` (`carries` when N = 1) |
| BK-1570 | ProjectTestsPage | `tagFilterKeepsListProjectScoped(args)` | The same tag, typed in this Project, lists this Project's matches and no foreign Test |
| BK-1573 | ProjectTestsPage | `showsNoMatchStateWithClear(tag)` | Copy `No Test carries this tag`, a `Clear` action, no table, no `No Tests yet` copy, no alert |
| BK-1574 | ProjectTestsPage | `sortsByNameAscendingThenReverses(expectedAscending)` | Name click → `sort=name&dir=asc` and ascending rows; second click → `dir=desc` and reversed rows |
| BK-1578 | ProjectTestsPage | `rowOpensTestDetailView(args)` | The row's open control lands on `/projects/{slug}/tests/{testId}` and shows the Test title and its chain ATC |

### New Helpers (No @atc)

| Component | Method | Returns | Description |
|-----------|--------|---------|-------------|
| TestsApi | `createUserStorySuccessfully` | `[APIResponse, CreateUserStoryResponse]` | POST story in a Module, asserts 201 |
| TestsApi | `createAcceptanceCriterionSuccessfully` | `[APIResponse, CreateAcceptanceCriterionResponse]` | POST AC in a story, asserts 201 |
| TestsApi | `createAtcSuccessfully` | `[APIResponse, CreateAtcResponse]` | POST ATC, asserts 201 |
| TestsApi | `createTestSuccessfully` | `[APIResponse, CreateTestResponse]` | POST Test, asserts 201 |
| TestsApi | `setTestTagsSuccessfully` | `[APIResponse, SetTestTagsResponse]` | PUT tags, asserts 200 |
| TestsApi | `seedTestWithChainSuccessfully` | `[APIResponse, CreateTestResponse]` | Composes the five calls above |
| ProjectTestsPage | `open` | `void` | Navigates to `/projects/{slug}/tests` |

### Disguised-helper check
`open` is a navigation with no assertion and is a helper, correctly without `@atc`. Every `@atc` above asserts a business outcome (a count, a row, a state, an order, a URL with the right Test).

## 4. Test Data Strategy

### Classification (Discover / Modify / Generate)

| Data | Pattern | Source (endpoint) | Placement | Cleanup |
|------|---------|-------------------|-----------|---------|
| Workspace | Generate | `POST /v1/workspaces` (`createWorkspaceSuccessfully`) | Test body, per test | None (no delete route). Accepted residue, see Q3 |
| Project(s) | Generate | `POST /v1/workspaces/{id}/projects` | Test body | None. Projects cannot be deleted |
| Module | Generate | `POST /v1/projects/{id}/modules` | Test body | None |
| User Story | Generate | `POST /v1/modules/{id}/user-stories` (new) | Inside `seedTestWithChain` | None |
| AC | Generate | `POST /v1/user-stories/{id}/acceptance-criteria` (new) | Inside `seedTestWithChain` | None |
| ATC chain | Generate | `POST /v1/atcs` (new), N per Test | Inside `seedTestWithChain` | None |
| Test | Generate | `POST /v1/tests` (new) | Inside `seedTestWithChain` | None |
| Tags | Generate | `PUT /v1/tests/{id}/tags` (new) | Inside `seedTestWithChain`, only when tags are given | None |

**Discover is not used** because the shared staging workspace reached the 1000-row cap (BK-266 precedent) and the counts (`N of M`) must be exact. **Modify is not used** because no test mutates a shared entity.

### Isolation rule
Each test creates its own Workspace. No test shares state with another. Titles are unique (see `DataFactory.createTestTitle`), so the substring checks in the foreign-title assertions cannot collide.

### DataFactory additions
One method, no new type (it returns a string):

```typescript
// tests/data/DataFactory.ts
/**
 * Test title for the BK-666 Tests list. Unique per call (uniqueId), <= 200 chars.
 * `label` is a leading word so sort tests can pin a deterministic order (Alpha < Bravo < Charlie).
 */
static createTestTitle(label: string): string {
  return `BK-666 ${label} ${this.uniqueId()}`;
}
```

Titles longer than 200 chars are never generated (the server limit is 200; the Stage 2 observation shows 211 accepted, which is not relied on).

### Constants
Tag constant `'smoke'` (reserved, lowercased by the server). Tag `'nightly'` for the no-match test. Both are literal values inside the test file, since they are scenario-specific, not shared (no `constants.ts` change).

## 5. Test Scenarios

### File: `tests/e2e/tests/browseProjectTests.test.ts`
Fixture: `{ test }` for all eight tests. Describe-level: `{ tag: ['@critical'] }`, following `listProjectsInIndex.test.ts`.

#### Scenario 1: BK-1560, sub-nav entry opens the list
Test: `"BK-666: should list a Tests entry in the project sub-nav and open the list when clicked"`
Preconditions: 1 Workspace, 1 Project, 1 Module, 1 Test with chain 1.
ATCs called: `ui.projectTests.openFromSubNavMarksTestsCurrent(project.slug)`.
Test-level assertions: none (the ATC asserts all).
Teardown: none.

#### Scenario 2: BK-1562, Project scoping on the plain list
Test: `"BK-666: should list only the current Project's own Tests given two Projects each holding its own"`
Preconditions: 1 Workspace, Project P1 with Module M1 and Tests `a1`, `a2` (chain 1 each), Project P2 with Module M2 and Test `b1` (chain 1).
ATCs called: `open(P1.slug)` then `listsOnlyCurrentProjectTests({ slug: P1.slug, ownTitles: [a1, a2], foreignTitles: [b1] })`; then `open(P2.slug)` and the same call with the roles swapped.
Teardown: none.

#### Scenario 3: BK-1566, row fields
Test: `"BK-666: should show name, chain length, tags and created date on every row"`
Preconditions: 1 Workspace, 1 Project, 1 Module. Test `long` with chain 7 and tags `['smoke']`; Test `short` with chain 1 and no tags.
ATCs called: `open(slug)` then `rowsShowNameChainCountTagsAndCreatedDay([{testId: long.id, title, chainLength: 7, tags: ['smoke'], createdDay}, {testId: short.id, title, chainLength: 1, tags: [], createdDay}])`. `createdDay` = `created_at` sliced to `YYYY-MM-DD` in UTC.

#### Scenario 4: BK-1569, the shared tag control narrows and counts
Test: `"BK-666: should narrow the list through the shared tag control and state N of M Tests carry the tag"`
Preconditions: 1 Workspace, 1 Project, 1 Module. Test `tagged` with tags `['smoke']`; Test `untagged` with no tags. Total M = 2.
ATCs called: `open(slug)` then `tagFilterNarrowsListAndStatesCount({ tag: 'smoke', matchingTitles: [tagged], total: 2 })`. Expected count copy: `1 of 2 Tests carries smoke`.

#### Scenario 5: BK-1570, tag filter does not leak across Projects
Test: `"BK-666: should keep the list Project-scoped when the typed tag also matches Tests in other Projects"`
Preconditions: 1 Workspace. P1 with Module M1 and Tests `p1-tagged` (tag `smoke`), `p1-plain` (no tags). P2 with Module M2 and Test `p2-tagged` (tag `smoke`).
ATCs called: `open(P1.slug)` then `tagFilterKeepsListProjectScoped({ tag: 'smoke', expectedTitles: [p1-tagged], foreignTitles: [p2-tagged] })`.

#### Scenario 6: BK-1573, no-match state
Test: `"BK-666: should show a distinct No Test carries this tag state with a Clear action given a tag matching nothing"`
Preconditions: 1 Workspace, 1 Project, 1 Module, 1 Test tagged `smoke` (so the Project is not empty).
ATCs called: `open(slug)` then `showsNoMatchStateWithClear('nightly')`.

#### Scenario 7: BK-1574, Name sort ascending then reversed
Test: `"BK-666: should sort by Name ascending and reverse the order on a second click"`
Preconditions: 1 Workspace, 1 Project, 1 Module, 3 Tests titled with leading labels `Alpha`, `Bravo`, `Charlie` (chain 1, no tags, created in the same run, so the default order is not what the test checks).
ATCs called: `open(slug)` then `sortsByNameAscendingThenReverses([alpha, bravo, charlie])`.

#### Scenario 8: BK-1578, row opens the Test detail
Test: `"BK-666: should open a Test's own detail view from its row with the chain as reached from the explorer"`
Preconditions: 1 Workspace, 1 Project, 1 Module, 1 Test `checkout` with chain 1 (its ATC title known).
ATCs called: `open(slug)` then `rowOpensTestDetailView({ slug, testId: checkout.id, title: checkout.title, chainAtcTitle })`.

## 6. Implementation Order

One commit per box (planning-playbook §6).

- [x] **C1: types.** Add `api/schemas/test.types.ts` (POST `/api/v1/tests`, PUT `/api/v1/tests/{id}/tags`). Extend `api/schemas/userStory.types.ts` (POST `/api/v1/modules/{id}/user-stories`, POST `/api/v1/user-stories/{id}/acceptance-criteria`). Extend `api/schemas/atc.types.ts` (POST `/api/v1/atcs`). Verify response key names (Module response key, Story response key) against `api/openapi-types.ts` first.
- [x] **C2: DataFactory.** DEVIATION (recorded after the Phase 3 review): `createTestTitle` was NOT added. The tests reuse the existing `DataFactory.createTestId(prefix)` instead, which already guarantees a unique, length-safe title and avoids the `BK-666 BK-666 ...` double prefix the sample below would have produced. Behaviour is equivalent; the sample snippet above is historical.
- [x] **C3: API component.** Create `tests/components/api/TestsApi.ts` (6 methods, helpers only). Register `tests` in `tests/components/ApiFixture.ts`, including `setAuthToken` / `clearAuthToken` propagation.
- [x] **C4: UI component.** Create `tests/components/ui/ProjectTestsPage.ts` (8 ATCs, `open`). Register `projectTests` in `tests/components/UiFixture.ts`.
- [x] **C5: test file.** Create `tests/e2e/tests/browseProjectTests.test.ts` (8 tests). No relative imports.
- [x] **C6: manifest.** `bun run kata:manifest`, then `bun run kata:manifest:check`.
- [x] **C7: verify.** Tests → types → lint (Rule #7). Run the new file on staging. Re-check every "Open" locator from §2 against the live DOM and record the result. Result 2026-11-13: 8 of 8 ATCs green on staging (`TEST_ENV=staging`, `--retries=0`), plus `types:check` and `eslint` on every touched file. The §2 "Open" locators held: the no-match state is matched by copy and `Clear` role, the detail heading by text, the Tags and Created cells by column position, and `created_at` renders as the UTC day.
- [ ] **C8: TMS.** Transition is Stage 4 / test-documentation, not this skill. Do NOT write to Jira/Xray from this plan.

## 7. Success Criteria

- [ ] All 8 ACs covered by the 8 TCs (AC-01, AC-03, AC-04, AC-05, AC-06, AC-07, AC-09). AC-02 and AC-11 are covered by the scoping ATC (BK-1562, BK-1570). AC-08 (viewer, cross-workspace) and AC-10 are out of this batch and stay Deferred or blocked (see `spec.md`).
- [ ] Risk-beyond-AC covered: no-match vs empty state (BK-1573), tag casing is NOT in this batch (TC-12 Deferred), foreign-Project leakage through the filter (BK-1570).
- [ ] Boundary cases: the 200-char title boundary (TC-09, Deferred). Stated, not automated.
- [ ] KATA compliance: one `@atc` per TC key, `{ test }` fixture, no relative imports, max 2 positional params (all ATCs take at most one positional param or an object).
- [ ] Fixture correct: no test mutates shared data.
- [ ] No hardcoded waits. Assertions use Playwright auto-waiting (`expect(...).toHaveText`, `waitForURL`).
- [ ] Aliases used (`@ui/`, `@api/`, `@schemas/`, `@TestFixture`, `@utils/decorators`).
- [ ] Tests pass locally and on staging. Met on staging 2026-11-13: 8 of 8 ATCs, 0 retries. Not run on local (the checkouts have no local dev server, so the batch is verified against staging only).
- [ ] TMS TCs stay as they are until the Stage 4 / Review path decides their transition.

## 8. Open Questions and Risks

Stated, not decided silently. Each one names who decides and what is affected.

| # | Question or risk | Affects | Who decides | Proposed handling |
|---|------------------|---------|-------------|-------------------|
| Q1 | **Stale local checkout.** `upex-bunkai-tms` is on `staging` at 1ba50026 (last commit 2026-10-25). The Tests list page and the BK-620 Project scoping (merged 2026-11-01) are absent in source. The live product has both. Selectors and scoping are proven by live evidence, not by source | All selectors, scoping assumption | Human: confirm the target commit, and whether to `git fetch` the sibling repo before Code | Run `git fetch` in the sibling and re-read the list page and `layout.tsx` before C4. Verify every "Open" locator live in C7 |
| Q2 | Folder for the test file: `tests/e2e/tests/` (proposed) vs `tests/e2e/project-tests/` | Naming only | Human, convention | Propose `tests/e2e/tests/`, which matches the TMS resource name |
| Q3 | **Data residue.** No DELETE route exists for Workspace, Project, Test or ATC. Each run leaves records in staging. Same accepted pattern as BK-266 | Staging hygiene | Human: accept the residue for the batch | Accept, one Workspace per test, documented in the file header |
| Q4 | **ADR check.** The "one throwaway Workspace per test" isolation contract is now reused by a second ticket (BK-266 and BK-666). The playbook asks to promote a cross-ticket data-isolation contract to an ADR | Possible ADR | Human | Not promoted now. Flagged for the human to decide whether it becomes an ADR (`.context/ADR/`) |
| Q5 | The em dash (no tags) is in BK-1566 (TC-07) and is also TC-08 (BK-1567), Deferred. Keeping it here follows the Story brief | Scope of BK-1566 | Human, or the reviewer of this plan | Keep, per the brief. Alternative: drop it from BK-1566 and leave it to BK-1567 |
| Q6 | No-match state and Clear action have no confirmed testids. The state may reuse `tests-list-empty` | BK-1573 locators | Phase 2 live check | Match by text and role until live testids are confirmed |
| Q7 | Detail view heading testid unknown (BK-1578). The route exists in source (`tests/[testId]/page.tsx`) | BK-1578 | Phase 2 live check | Match by text, then tighten to a testid if one exists |
| Q8 | Tags cell has no testid, and it is unclear whether the headers are `<th>` (BK-1566 uses `columnheader` role). The em dash is U+2014 | BK-1566 | Phase 2 live check | Read by column position and header text. Confirm the role before relying on it |
| Q9 | Created day: the Gherkin says UTC. Live evidence shows `YYYY-MM-DD`. Local vs UTC rendering is not proven. A UTC runner or a non-UTC machine could disagree | BK-1566 flakiness | Phase 2 live check | Compute the expected day in UTC in the test. If the UI renders local time, the test will fail and that is a finding, not a test bug |
| Q10 | Success codes and response keys for `POST /v1/modules/{id}/user-stories` and `POST /v1/atcs` are not confirmed (AC POST is 201). The module response key is assumed (`module`) | `TestsApi` helpers | Dev check in C1 | Read the OpenAPI response for each path before writing the helpers. `expect(...).toBe(201)` if confirmed |
| Q11 | BK-1560 Gherkin also says "Tests appears right after All ATCs". Not automated, because the All ATCs testid is not confirmed | BK-1560 scope | Phase 2 | Add the order assertion once the testid is known. Not added now, so no guessed selector is shipped |
| Q12 | Unfiltered count copy with M = 1 (`1 Test in this project` or other) is not confirmed. The batch avoids asserting it (BK-1562 does not check the count) | BK-1562 | Phase 2 live check | Keep it out of the assertions until confirmed |
| R1 | **Seeding depth.** One Test costs 3 + N + 2 API calls (workspace, project, module, story, AC, N ATCs, Test, tags). Chain 7 in BK-1566 costs about 14 calls | Runtime | Accepted | Acceptable for 8 tests. Revisit if the suite grows |
| R2 | **Auth shape.** `clearAuthToken()` makes calls use the session cookie. The Test POST accepts a body `workspace_id`, so the cookie's active workspace is not the source of truth. Good, but it relies on the same session that the browser uses | Correctness | Accepted | Pass `workspace_id` in every create |
| R3 | **Out of batch.** TC-24 (cross-workspace) and TC-25 (viewer) need a second identity. They are not in these 8 TCs and stay blocked | Coverage | Human: a second staging identity | Not automated here |
