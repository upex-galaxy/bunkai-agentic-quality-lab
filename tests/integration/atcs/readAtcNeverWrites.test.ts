/**
 * KATA Architecture - BK-595 Single-ATC Read Side-Effect Integration Test
 *
 * TC22 (BK-1389): reading the same ATC repeatedly - lean, fully expanded, lean,
 * expanded again - never advances `version`, never moves `updated_at`, and the
 * expanded step content does not drift.
 *
 * Project: integration (depends on api-setup, no browser cookies)
 */

import { test } from '@TestFixture';

/** Stable ATC in the staging QA workspace carrying steps, assertions, and criteria. */
const FIXTURE_ATC_ID = '06391422-2283-4688-995b-74f39f6cb564';

test.describe('BK-595: Read a single ATC by id (reads never write)', { tag: ['@regression'] }, () => {
  test('BK-1389: should leave version, updated_at and step content unchanged after repeated lean and expanded reads', async ({ api }) => {
    await api.atcs.expectRepeatedReadsLeaveAtcUnchanged(FIXTURE_ATC_ID);
  });
});
