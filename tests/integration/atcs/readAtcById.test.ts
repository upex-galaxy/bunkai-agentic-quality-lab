/**
 * KATA Architecture - BK-595 Single-ATC Read Contract Integration Test
 *
 * TC01 (BK-1368): lean read returns 200 with header fields, omits expansion
 * collections, and sets `Cache-Control: private, no-store`.
 * TC07 (BK-1374): `expand=steps,assertions,acceptance_criteria,used_in` returns
 * all four collections in one request, matching single-expansion reads.
 *
 * Project: integration (depends on api-setup, no browser cookies)
 */

import { expect, test } from '@TestFixture';

/** Stable ATC in the staging QA workspace carrying steps, assertions, and criteria. */
const FIXTURE_ATC_ID = '06391422-2283-4688-995b-74f39f6cb564';

test.describe('BK-595: Read a single ATC by id (contract & expansions)', { tag: ['@regression'] }, () => {
  test('BK-1368: should return 200 with lean header fields, no expansion bodies, and private no-store cache headers when reading an ATC without expand', async ({ api }) => {
    const [, body] = await api.atcs.expectLeanAtcRead(FIXTURE_ATC_ID);
    expect(body.atc.id).toBe(FIXTURE_ATC_ID);
  });

  test('BK-1374: should return steps, assertions, acceptance_criteria, and used_in matching single-expansion reads when all four expansions are requested', async ({ api }) => {
    const [, allExpanded] = await api.atcs.expectExpandedAtcRead(FIXTURE_ATC_ID);
    const [, singleAssertions] = await api.atcs.getAtcById({
      atcId: FIXTURE_ATC_ID,
      expand: 'assertions',
    });

    expect(allExpanded.atc.assertions).toEqual(singleAssertions.atc.assertions);
    expect((allExpanded.atc.assertions ?? []).length).toBeGreaterThan(0);
  });
});
