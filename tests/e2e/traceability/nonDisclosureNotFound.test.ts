/**
 * KATA Architecture - BK-45 Traceability Non-Disclosure Guard
 *
 * BK-448 (TC16): a foreign-workspace story and a nonexistent story ID must
 * both resolve to the SAME uniform not-found state, with zero chain data
 * (AC/ATC/Test/Run/Defect) ever leaking into the DOM.
 *
 * Project: bk-45-traceability-fixtures (workspace's only reachable project
 * for the qa3 test identity as of 2026-08-25).
 */

import { randomUUID } from 'node:crypto';

import { test } from '@TestFixture';

const FIXTURE_PROJECT_SLUG = 'bk-45-traceability-fixtures';

test.describe('BK-45: Traceability non-disclosure guard', () => {
  test('BK-448: should return the uniform not-found state for a nonexistent story ID', async ({ ui }) => {
    await ui.traceability.expectNonDisclosureNotFound({
      projectSlug: FIXTURE_PROJECT_SLUG,
      targetStoryId: randomUUID(),
    });
  });

  // PARKED (deferred, not blocked) — the foreign-workspace row needs a story
  // that lives in a workspace the primary test user is NOT a member of, and
  // one identity cannot build that: any workspace it creates, it owns.
  // Re-assessed 2026-10-26: the August blocker (Members "Coming soon") is
  // gone, and a second confirmed staging account was verified to sign in.
  // What remains is plain work, not a product gap: declare
  // STAGING_USER2_EMAIL / STAGING_USER2_PASSWORD, add them as CI secrets,
  // let user 2 own a reusable fixture story (Discover-or-Create), then open it
  // under the primary user's own project slug. Sign-up alone cannot do it at
  // runtime: it emails a 6-digit code, so the account must be confirmed once
  // by hand. See spec.md "Blockers" for the plan and the open question to
  // settle first (does the app answer uniformly for a foreign story?).
  test.fixme('BK-448: should return the uniform not-found state for a foreign-workspace story', async ({ ui }) => {
    await ui.traceability.expectNonDisclosureNotFound({
      projectSlug: FIXTURE_PROJECT_SLUG,
      targetStoryId: '/* real story ID from a reachable foreign workspace - not constructible today */',
    });
  });
});
