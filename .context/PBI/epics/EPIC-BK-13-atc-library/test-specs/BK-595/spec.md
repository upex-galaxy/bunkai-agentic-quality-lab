# BK-595: Automation Spec (first pass: BK-1368, BK-1374, BK-1377, BK-1378, BK-1379)

| Field | Value |
|-------|-------|
| **Priority** | P0 (BK-1379 ROI 6.25, BK-1368/1377/1378 ROI 5.00, BK-1374 ROI 4.00) |
| **Phase** | Ticket-driven, first high-ROI pass of BK-595 (`GET /api/v1/atcs/{id}`) |
| **Items** | 5 TCs (100% API integration, `{ api }` fixture, no browser) |
| **Dependencies** | None blocking. Pure read surface with zero database writes |
| **Requires** | Staging reachable, `.env` Owner account (`STAGING_USER_EMAIL` / `STAGING_USER_PASSWORD`), default PAT holding `atc:read` |
| **Source** | Story BK-595 (Epic BK-13 ATC Library), Stage 1-3 artifacts in `.session/sprint-testing/BK-595/` |

## Summary

BK-595 exposes `GET /api/v1/atcs/{id}` (`atc:read` or cookie session). By default it returns the lean ATC header with `Cache-Control: private, no-store` and omits child collections (`steps`, `assertions`, `acceptance_criteria`, `used_in`). Callers opt into detail via `expand=steps,assertions,acceptance_criteria,used_in`. Malformed UUIDs and unrecognised `expand` values return `400 bad_request`, and absent/inaccessible/archived ATCs return a uniform `404 not_found`.

## Test Cases

| TMS ID | Title | Type | Priority |
|--------|-------|------|----------|
| BK-1368 | TC01: should return 200 with lean header fields, no expansion bodies, and private no-store cache headers | Positive | P0 |
| BK-1374 | TC07: should return all four collections when expand=steps,assertions,acceptance_criteria,used_in is requested | Positive | P0 |
| BK-1377 | TC10: should reject an unrecognised expand token with 400 bad_request and no partial payload | Negative | P0 |
| BK-1378 | TC11: should return uniform 404 not_found with details.reason=not_found when the ATC UUID does not exist | Negative | P0 |
| BK-1379 | TC12: should reject malformed ATC ids with 400 bad_request and no payload leak | Negative | P0 |

## Acceptance Criteria

- [x] 5 TCs automated across `readAtcById.test.ts` and `rejectInvalidAtcRead.test.ts`
- [x] Tests pass on staging (`TEST_ENV=staging bun run test`, zero retries)
- [x] `types:check`, `lint:check` and `kata:manifest:check` clean
