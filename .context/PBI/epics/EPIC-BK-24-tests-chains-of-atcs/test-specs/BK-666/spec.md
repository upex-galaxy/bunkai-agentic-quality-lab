# BK-666: TMS-Test List, browse, filter and sort every Test in a Project

| Field | Value |
|-------|-------|
| **Priority** | P0 (BK-1560, BK-1562, BK-1566, BK-1570, BK-1578) / P1 (BK-1569, BK-1573, BK-1574) |
| **Phase** | Standalone (Story BK-666, status Ready For Release; ATS BK-1586) |
| **Items** | 8 TCs, 8 ATCs (one ATC per TC key), 0 multi-ATC flows |
| **Dependencies** | BK-620 (Project scoping of the Tests list, merged 2026-11-01 per ATP BK-1587). Not a blocker: the list is Project-scoped on staging |
| **Requires** | Staging storage state from `ui-setup` (cookie session). Product API reachable with the session cookie (`clearAuthToken()`). No pre-existing data: every precondition is generated per test |
| **Source** | Story: BK-666 / ATS: BK-1586 / ATR of record: BK-1588 (Stage 2 verdicts, 24 of 26 executed, 0 defects) |

## Summary

The Project Tests list (`/projects/{slug}/tests`) is a new surface that lets a Senior QA find the Test to run before a deploy without scanning the explorer rail. This batch automates the 8 Candidate TCs that the PRIORITIZATION report marks as worth automating: sub-nav reachability, Project scoping (including the tag-filter path), row fields, the shared tag filter and its N-of-M count, the distinct no-match state, Name sort, and the row-to-detail navigation. The remaining TCs stay Deferred or blocked (BK-1561, BK-1563 to BK-1565, BK-1567, BK-1568, BK-1571, BK-1572, BK-1575 to BK-1577, BK-1579 to BK-1585; BK-1583 and BK-1584 are not executable on the current staging identity).

Every test seeds its own data through the product API inside a throwaway Workspace, so no test reads or depends on the shared staging content (the BK-266 precedent: the shared workspace hit the 1000-row cap of the index).

## Test Cases

| TMS ID | Title | Type | Priority | ATC method (component) |
|--------|-------|------|----------|------------------------|
| BK-1560 | TC-01: should list a Tests entry in the project sub-nav and open the list when clicked | Positive | P0 | `openFromSubNavMarksTestsCurrent` (ProjectTestsPage) |
| BK-1562 | TC-03: should list only the current Project's own Tests given a Workspace with two Projects each holding its own Tests | Negative (leak) | P0 | `listsOnlyCurrentProjectTests` (ProjectTestsPage) |
| BK-1566 | TC-07: should show name, chain length, tags and created date on every row | Positive | P0 | `rowsShowNameChainCountTagsAndCreatedDay` (ProjectTestsPage) |
| BK-1569 | TC-10: should narrow the list through the shared tag control and state N of M Tests carry the tag | Positive | P1 | `tagFilterNarrowsListAndStatesCount` (ProjectTestsPage) |
| BK-1570 | TC-11: should keep the list Project-scoped when the typed tag also matches Tests in other Projects given the intersection (BK-1548) | Negative (leak) | P0 | `tagFilterKeepsListProjectScoped` (ProjectTestsPage) |
| BK-1573 | TC-14: should show a distinct No Test carries this tag state with a Clear action given a tag matching nothing | Negative | P1 | `showsNoMatchStateWithClear` (ProjectTestsPage) |
| BK-1574 | TC-15: should sort by Name ascending and reverse the order on a second click | Positive | P1 | `sortsByNameAscendingThenReverses` (ProjectTestsPage) |
| BK-1578 | TC-19: should open a Test's own detail view from its row with the chain as reached from the explorer | Positive | P0 | `rowOpensTestDetailView` (ProjectTestsPage) |

Bodies live in Jira. The Gherkin was read with `bun xray test get <KEY>` (read-only) and is not copied here. Synced stubs sit under the Story's `test-cases/` folder.

## Automation Plan

**Order**: BK-1560 first, because it proves the sub-nav entry and the seed path end to end. BK-1566 and BK-1578 next, since they cover the row contract that every other ATC reads. The tag and sort ATCs (BK-1569, BK-1570, BK-1573, BK-1574) follow, and BK-1562 closes the batch on the scoping rule.

**Shared fixtures**: all eight ATCs need a Workspace, a Project, a Module and at least one Test with a chain of ATCs. The seeding chain is written once in `TestsApi.seedTestWithChainSuccessfully` and called by every test. No ATC calls another ATC.

**Blocked by**: nothing that stops automation. The list page is not in the local `upex-bunkai-tms` checkout, so its selectors come from the live Stage 2 evidence. A few are still open (`automation-plan.md` §2, UI Elements, and §8 open questions). They are verified against the live DOM in Phase 2, not guessed.

**Preconditions for the whole scope**: a staging storage state from `ui-setup`. A session that can create Workspaces (any authenticated member). No viewer role and no second identity are needed for these eight TCs.

## Merged TCs
| Removed ID | Merged Into | Reason |
|-----------|-------------|--------|
| (none) | | |

## Updated TCs
| TC ID | Spec File | What Was Added | Reason |
|-------|-----------|----------------|--------|
| (none) | | | |

## Acceptance Criteria
- [ ] 8 TCs automated, one `@atc` per TC key, one `test()` per TC, prefix `BK-666:`
- [ ] Every test seeds its data through the product API and reads inside its own Workspace
- [ ] Tests pass locally and on staging (Phase 2 gate, `bun run test` scoped to the new file)
- [ ] `kata-manifest.json` regenerated and `kata:manifest:check` clean after the Code phase
