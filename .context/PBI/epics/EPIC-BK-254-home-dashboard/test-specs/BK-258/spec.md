# BK-258: Automation Spec (first pass: BK-1101, BK-1100, BK-1093)

| Field | Value |
|-------|-------|
| **Priority** | P0 (BK-1101 ROI 6.3, BK-1100 ROI 3.0) / P0 (BK-1093 Critical, ROI 1.6) |
| **Phase** | Standalone, first pass of the BK-258 ticket-driven scope (second pass: TC2 BK-1094, TC4 BK-1096, then TC3 BK-1095, TC7 BK-1099) |
| **Items** | 3 TCs (2 API integration, 1 E2E UI + API oracle) |
| **Dependencies** | None blocking. Shares the open-bugs read (BK-1100) as the oracle of every Home UI TC |
| **Requires** | Staging reachable, `.env` Owner account (`STAGING_USER_EMAIL` / `STAGING_USER_PASSWORD`, name only), Owner role in the active workspace, Playwright chromium matching the installed `@playwright/test` (TC1 only) |
| **Source** | Story BK-258 (Epic BK-254 Home Dashboard), Stage 4 verdicts in `.context/reports/PRIORITIZATION-BK-258.md` |

## Summary

BK-258 adds an "Open bugs" card to Home and a workspace read, `GET /api/v1/workspaces/{id}/open-bugs`, that returns `{ open_count, by_severity, open_statuses }`. "Open" means status `open` or `in_progress`; bugs in archived modules are excluded. This first pass automates the three cheapest, highest-value Candidates: the authorization decision on the API (BK-1101), the API contract and cross-credential parity (BK-1100) and the Home card happy path with the API as numeric oracle (BK-1093). Together they put the open-bugs read, the Home page object and the bug/module seeding helpers in place, which TC2, TC3, TC4 and TC7 reuse in the second pass.

## Test Cases

> Bodies live in Jira. Synced copies sit under the Story's `test-cases/`
> (`.context/PBI/epics/EPIC-BK-254-home-dashboard/stories/STORY-BK-258-.../test-cases/`);
> run `bun run jira:sync-issues get BK-258 --include-comments` if they are not on disk.

| TMS ID | Title | Type | Priority |
|--------|-------|------|----------|
| BK-1101 | TC9: should reject the open-bugs API with 401 or 403 when the caller is unauthenticated or lacks atc:read | Negative (+ allowed contrast rows) | P0 |
| BK-1100 | TC8: should return open_count and by_severity matching the Home card when a workspace member calls the open-bugs API | Verification / contract | P0 |
| BK-1093 | TC1: should show the open bug total with a P1-P4 breakdown that sums to it given open bugs at several severities | Positive | P0 |

## Product surface (from `api/openapi-types.ts`, already synced; no `bun run api:sync` needed)

| Item | Value |
|------|-------|
| Endpoint | `GET /api/v1/workspaces/{id}/open-bugs` (present in `api/openapi-types.ts` line 1619, schema `OpenBugs`) |
| Auth | Bearer PAT with `atc:read`, or cookie session. No cookie and no bearer: 401 `unauthorized`. Invalid bearer: 401 `unauthorized`. PAT without `atc:read`: 403 (message observed in Stage 2: "Missing required capability: atc:read") |
| Foreign / nonexistent workspace | 200 with zeroes (non-disclosure; BK-1103 Deferred) |
| Home route | `/home`; test ids `home-open-bugs`, `home-open-bugs-count`, `home-open-bugs-severities`, `home-open-bugs-severity-{P1..P4}`, `home-open-bugs-skeleton`, `home-open-bugs-empty`, `home-open-bugs-error` (from the TC and the story context, read from `components/home/OpenBugs.tsx`) |
| Chip text | `P{n} {Label} {count}` e.g. "P1 Critical 2" (from evidence screenshot `BK-258-ac1-tc1-total-and-breakdown.png`) |
| Seeding endpoints | `POST /api/v1/workspaces/{id}/projects` (exists in `ProjectsApi`), `POST /api/v1/projects/{id}/modules` (new helper), `POST /api/v1/bugs` (new helper, `atc:write` or cookie), `POST /api/v1/bugs/{id}/status` (new helper, forward-only one stage per call), `DELETE /api/v1/modules/{id}` (archive, cleanup) |
| PAT minting | `POST /api/v1/auth/signin` accepts `pat_scopes`, `pat_name`, `pat_expires_in_days`; `DELETE /api/v1/tokens/{id}` revokes. `POST /api/v1/tokens` is session-authenticated only (PATs cannot mint PATs) |

## kata-manifest.json cross-check (2026-10-06, `kata:manifest:check` clean)

- No `@atc` with id BK-1093, BK-1100 or BK-1101 exists in `components.api[].atcs[]` or `components.ui[].atcs[]`.
- No `OpenBugsApi`, `BugsApi` or `HomePage` component exists. `ProjectsApi` exists (0 ATCs, one setup helper) and is reused and extended with one helper; `AuthApi` exists and is extended with one helper; `AuthApi.getCurrentUser` is reused as-is.
- No Steps module exists (`steps: []`); none is proposed (see automation-plan section 2).

## Automation Plan

**Order**: (1) BK-1100 first, because its `getOpenBugs` helper is the oracle BK-1093 reads for baseline and parity and its credential matrix de-risks the PAT-mint helper that BK-1101 also needs. (2) BK-1101 next (same component, same minting helper, no new surface). (3) BK-1093 last (needs the Home page object plus the three seeding helpers and a working chromium).

**Shared fixtures**: `OpenBugsApi.getOpenBugs` (helper, created with BK-1100, used by BK-1093 baseline and parity); `AuthApi.mintScopedPat` (created with BK-1100, used by BK-1101); `ProjectsApi.createModuleSuccessfully`, `ProjectsApi.archiveModuleSuccessfully`, `BugsApi.createBugSuccessfully`, `BugsApi.advanceBugStatusSuccessfully` (all created with BK-1093, reused by TC2 and TC3 in the second pass).

**Blocked by**: Nothing for BK-1100 and BK-1101. BK-1093 needs `bun run pw:install` (Playwright 1.60.0 expects chromium build 1223, installed builds are 1224, 1234 and 1243). No DB access (`DBHUB_*` mostly empty), so the optional DB-parity leg of BK-1100 stays out of scope.

**Preconditions for the whole scope**: the `.env` staging user is Owner of a workspace with at least one project-creation right (verified read-only on 2026-10-06: 2 workspaces, role `owner`, default PAT scopes `atc:read, atc:write, run:execute`). The shared workspace carries other sessions' bugs (observed baseline 4 open: P1 1, P2 2, P3 1, P4 0), so every count assertion is a delta against a baseline read at test time.

## Merged TCs (if any)

None. TC9 keeps its 5 Examples rows as data rows of ONE parameterized ATC (Decision Table rows, see `atc/BK-1101.md`).

## Updated TCs (if any)

None. Observation for Stage 4 owners: TC8 rows "bearer token" and "PAT atc:read" and TC9 allowed rows "PAT atc:read" and "browser session cookie" overlap (both assert 200 for the same two credentials). The plan automates both as authored for traceability; the TC9 allowed rows are the first candidates to drop if suite time ever matters (each is a single GET).

## Test-Design Checklist (doctrine Part 3)

```
[x] P1  Beyond "every AC passes": TC9 (authz) and TC8 (contract) are risk-beyond-AC; TC1 is the AC1 floor
[x] P2  AC1 is the floor; TC8/TC9 are above the line
[x] P3  Each case is a concrete exploration (data, credential, state), not an AC restatement
[x] P4  AC1 -> TC1 plus TC2/TC3/TC7/TC8 (second pass for TC2/TC3/TC7); no collapse to one case
[x] P5  Auth, contract and cross-credential anomalies covered; UI race (RSC streaming) handled by skeleton wait
[x] EP   Credential partitions: none / invalid bearer / PAT-without-scope / PAT-with-scope / cookie
[x] BVA  N/A in this pass: no range or limit in TC1/TC8/TC9 (count 0 and 1 boundaries belong to TC4 and TC5, TC4 is in the second pass, TC5 is Deferred)
[x] BVA-D N/A: raw integer counts, no rounding or truncation
[x] ST   TC1 only uses valid forward transitions (open -> in_progress) to seed; the lifecycle state machine is TC6 (Deferred) and TC2 (second pass, states resolved/closed)
[x] DT   TC9 is the decision table: credential present x atc:read held, 5 surviving rules
[x] PW   N/A: fewer than 3 combinable factors
[x] PARAM TC9: 5 rows in one parameterized ATC; TC8: 3 rows in one parameterized ATC
[x] RISK Ordered by ROI; nothing dropped silently. Deferred TCs listed in automation-plan section 9
[x] OBS  Every precondition reachable: no empty-state case in this pass (TC4 needs the fixture workspace, second pass)
```

## Acceptance Criteria

- [ ] 3 TCs automated: BK-1101 (5 rows), BK-1100 (3 rows), BK-1093 (1 scenario)
- [ ] Tests pass on staging (`bun run test` for the three files, zero retries)
- [ ] `types:check`, `lint:check` and `kata:manifest:check` clean
- [ ] Every created bug, module and PAT is cleaned up (archive module, revoke PATs); workspace baseline restored

## Second pass (BK-1094, BK-1096)

Planned in `automation-plan-pass2.md` with ATC specs `atc/BK-1094.md` and `atc/BK-1096.md`. Each TC passed a "worth automating?" gate first: BK-1094 AUTOMATE (4 rows, one ATC); BK-1096 SPLIT (zero-state render against the existing fixture workspace, conditional on spikes W1 and W2; rows "only resolved/closed" and "open in archived module" stay manual). BK-1095 and BK-1099 remain deferred.

## Regression pass (BK-1102)

Additive after the second pass. The header, field table and first-pass prose above describe the original scope and are not rewritten. BK-1102 was recorded as deferred in `automation-plan.md` section 9 and `automation-plan-pass2.md` section 10; this pass lifts that deferral at the requester's direction. Both earlier plans carry a one-line superseded note pointing here; neither was rewritten.

| TMS ID | Title | Type | Priority |
|--------|-------|------|----------|
| BK-1102 | TC10: should return 400 bad_request when the workspace id is not a UUID | Negative | P2 |

**Order**: standalone, one step. Add `OpenBugsApi.expectBadRequestForMalformedWorkspaceId` (ATC `BK-1102`) and `tests/integration/home/rejectMalformedWorkspaceId.test.ts`.

**Shared fixtures**: none new. Reuses `OpenBugsApi` (already registered as `openBugs`, token propagation already wired) and the `{ api }` fixture.

**Data rows**: four, one `test()` per row with a fresh `api` context: `not-a-uuid` (plain word), `1234567890` (ungrouped numeric string), and the valid UUID `3f2504e0-4f89-11d3-9a0c-0305e82c3301` at lengths 35 and 37. No workspace discovery, no seeding, no cleanup.

**Blocked by**: nothing. No spike, no seed data, no DB access.

**Precondition for the scope**: the default PAT held by the `{ api }` fixture must satisfy `atc:read`, because `withApiHandler` authenticates before the handler validates the id; a missing or under-scoped credential would answer 401/403 instead of 400.

**Acceptance criteria**: BK-1102 green on staging with zero retries; `types:check`, `lint:check` and `kata:manifest:check` clean; `kata-manifest.json` regenerated after the code lands.

**ATC spec**: `atc/BK-1102.md`.
