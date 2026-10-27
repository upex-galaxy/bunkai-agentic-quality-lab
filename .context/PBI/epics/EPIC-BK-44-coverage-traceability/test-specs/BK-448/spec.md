# BK-448: TC16: should return an identical non-disclosure response given foreign-workspace or nonexistent story

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Phase** | Standalone (regression-driven) |
| **Items** | 1 TC (parametrized, 2 rows) |
| **Dependencies** | Row 2 (nonexistent story): none. Row 1 (foreign-workspace story): a second workspace with a real story — **not constructible on staging today** (see Blockers). |
| **Source** | Story: BK-45 (AC-05, second scenario) · Test: BK-448 (Candidate, ROI 16.7) · ATP outline: TC-BK45-16, Decision Table rules 3+4, collapsed (same outcome) |

## Summary

BK-448 is BK-45's dominant security risk driver: a read path over sensitive coverage/defect data spanning workspaces, where the one possible negative finding is a CRITICAL-severity data leak. AC-05's second scenario asks for "403 Forbidden or equivalent access-denied UI"; the shipped implementation deliberately maps both "foreign-workspace story" and "nonexistent story ID" to the same uniform HTTP 404 `not_found` with identical wording ("User story not found.") — an anti-enumeration / non-disclosure pattern matching BK-175 and BK-23. A caller must never be able to distinguish "story exists but you can't see it" from "story doesn't exist" — that distinction is itself a resource-existence enumeration side-channel across workspace boundaries. Unit tests on `mapTraceabilityRpcError` and the DB-integration suite (`story-traceability-isolation.test.ts`, 11/11) assert the mapping and the isolation in isolation; only a live E2E hitting the real route through the browser proves the two HTTP responses are byte-identical (status + message) AND that neither leaks any chain data into the DOM or network payload. ROI = 16.7 (Frequency 5 × Impact 5 × Stability 4 / Effort 3 × Dependencies 2).

## Preconditions

- Authenticated workspace member (any role — the gate under test is workspace membership, not role).
- Row 2 (nonexistent story): a random UUID with no matching row. No fixture dependency — generate at runtime.
- Row 1 (foreign-workspace story): a real story belonging to a workspace the authenticated actor is NOT a member of. **Cannot be constructed on staging today** — see Blockers.

## Test Cases

### BK-448: should return an identical non-disclosure response for foreign-workspace and nonexistent stories

**Preconditions**: Authenticated member of one workspace; a target story ID that is either (a) real but foreign-workspace, or (b) a random nonexistent UUID.
**Action**: Navigate to `/projects/{project_slug}/traceability?story={target_story_id}`.
**Expected Output**:
- The response status is 404.
- The response body reads "User story not found." — note: the SSR first-paint DOM shows a *generic* `[data-testid="traceability-error"]` message ("Couldn't load the evidence chain"), not this specific string; the specific string only surfaces after a client-side Retry (see empirical finding in `automation-plan.md` §6). The literal-string assertion must therefore target the network response, not first-paint DOM text.
- Zero chain data (AC, ATC, Test, Run, Defect) is present in the DOM or network payload, in either case.
- The response is identical (status + message) across both rows.

```gherkin
@high @regression @e2e @automation-candidate @BK-45
Scenario Outline: should return an identical non-disclosure response for foreign-workspace and nonexistent stories
  Given an authenticated member of workspace "{own_workspace_slug}"
  And "<target_case>" targets "{target_story_id}"
  When the member opens "/projects/{project_slug}/traceability?story={target_story_id}"
  Then the response status is 404
  And the response body reads "User story not found."
  And zero chain data (AC, ATC, Test, Run, Defect) is present in the DOM or network payload
  And the response is identical (status + message) across both rows of this outline

  Examples:
    | target_case                    |
    | a real foreign-workspace story |
    | a random nonexistent story ID  |
```

## Merged TCs (if any)

None new. The 2 Examples rows are the ATP's own Decision-Table rules 3+4, already collapsed into one TC by `/test-documentation` (same outcome, same assertions) — this plan does not re-derive that merge, it inherits it.

## Updated TCs (if any)

None.

## Blockers (read before Phase 2)

**Row 1 (foreign-workspace story) is BLOCKED — infra/capability gap, not a code or data-seeding problem.**

- BK-45's own Stage 2 execution (`test-session-memory.md` TC-16 row, 2026-08-08) already hit this: *"Foreign-workspace half: BLOCKED (test-data gap) — only one workspace/account available in `.env`, cannot construct genuine cross-workspace non-membership."* Same root cause blocked TC-15 (viewer-role access) in the same session: *"Settings → Members shows 'Coming soon' — this build has no invite/second-member mechanism at all."*
- The sibling story BK-50 hit the identical wall and recorded it explicitly in its Stage 4 report (`test-specs/BK-50` README / prioritization doc): *"TC-BK50-09 (foreign-workspace rejection) — Blocked, not covered. No second workspace can be constructed — Settings → Members is still 'Coming soon'. ... Revisit when Members ships."*
- `.env` today only defines one staging identity (`STAGING_USER_EMAIL` / `STAGING_USER_PASSWORD`) — no second-workspace credential exists to construct row 1 even manually.
- This is the SAME root blocker parking BK-445 (Members/second-account gap), not a new discovery — this session only reconfirms it against BK-448 specifically.

**Row 2 (nonexistent story ID) is NOT blocked.** It needs no second workspace, no seeded fixture — just a runtime-generated random UUID. It was already manually verified PASS in BK-45 Stage 2 (`evidence/BK-45-tc16-nonexistent-story-notfound.png`): uniform 404 + "User story not found.", zero chain data leak confirmed via network log, reproduced against 3 distinct random UUIDs.

**Re-assessment 2026-10-26 (supersedes the "not constructible" claim above)**: the root blocker has moved. The invite and sign-up endpoints now exist (`/workspaces/{id}/invites`, `/invites/accept`, `/auth/signup`), and a second confirmed staging account was verified to sign in. Row 1 is therefore DEFERRED, not blocked. What it still needs:

- A second identity that is NOT a member of the primary user's workspaces. Sign-up cannot create it at runtime: it emails a 6-digit code, so the account is confirmed once by hand and its credentials live in `STAGING_USER2_EMAIL` / `STAGING_USER2_PASSWORD` (local `.env` and CI secrets).
- A reusable fixture story owned by that user (Discover-or-Create: one workspace, project, module and story, found by name and created only when absent), then opened under the primary user's OWN project slug. A per-run workspace is rejected: workspaces cannot be deleted and staging already hit the 1000-project cap once.
- An open question to settle first: whether the app answers a foreign story uniformly. If it does not, that is a product bug, so the row becomes `test.fail('Blocked by <BUG-KEY>')`, never a looser assertion.

Why it is deferred and not done: BK-448 is not an assigned ticket today, and only row 2 is covered. The Jira Test must not be read as full coverage until row 1 lands.

**Decision for this plan**: code row 2 now (unblocked, ROI-positive on its own). Park row 1 as an explicit `test.fixme()` with a comment citing this blocker, ready to un-skip the day Members/invite ships — mirroring how TC-15 and BK-445 are already parked. Do not invent a workaround (DB-level actor spoofing, hardcoded second account) — none is available, and the DB-integration suite (`story-traceability-isolation.test.ts`) already covers the isolation property at that layer; only the live E2E surface (DOM/network non-disclosure at the UI) is genuinely missing, and only for row 1.

## Acceptance Criteria

- [ ] Row 2 (nonexistent story ID) automated and green: uniform 404, "User story not found." on the network response, zero chain data in the DOM.
- [ ] Row 1 (foreign-workspace story) explicitly parked (`test.fixme`), not silently dropped — traceable back to this blocker note and to TC-BK50-09 / BK-45 TC-15.
- [ ] Test passes on staging.
- [ ] BK-448 marked "In Automation" (partial — row 2 only) once Row 2's Review passes; full "Automated" deferred until row 1 unblocks.
