/**
 * KATA Architecture - BK-595 `expand` Parser Integration Test
 *
 * TC09 (BK-1376): the `expand` query is normalised with the documented rules -
 * case-insensitive, trimmed, empty segments ignored, duplicates collapsed,
 * repeated params merged - and the payload carries exactly the requested
 * collections. Refusal of an unknown token is owned by BK-1377, not repeated.
 *
 * Project: integration (depends on api-setup, no browser cookies)
 */

import type { AtcExpansionKey } from '@api/AtcsApi';

import { test } from '@TestFixture';

/** Stable ATC in the staging QA workspace carrying steps, assertions, and criteria. */
const FIXTURE_ATC_ID = '06391422-2283-4688-995b-74f39f6cb564';

interface ExpandRow {
  label: string
  query: string
  expected: AtcExpansionKey[]
}

const EXPAND_ROWS: ReadonlyArray<ExpandRow> = [
  {
    label: 'the value is uppercase',
    query: '?expand=STEPS',
    expected: ['steps'],
  },
  {
    label: 'the values are padded with spaces',
    query: '?expand=%20steps%20,%20assertions%20',
    expected: ['steps', 'assertions'],
  },
  {
    label: 'the same value is repeated inside one param',
    query: '?expand=steps,steps',
    expected: ['steps'],
  },
  {
    label: 'the param is present but empty',
    query: '?expand=',
    expected: [],
  },
  {
    label: 'the param is repeated across the query',
    query: '?expand=steps&expand=assertions',
    expected: ['steps', 'assertions'],
  },
];

test.describe('BK-595: Read a single ATC by id (expand parser rules)', { tag: ['@regression'] }, () => {
  for (const row of EXPAND_ROWS) {
    test(`BK-1376: should apply the documented parser rule when ${row.label}`, async ({ api }) => {
      await api.atcs.expectExpandParserApplied({
        atcId: FIXTURE_ATC_ID,
        query: row.query,
        expected: row.expected,
      });
    });
  }
});
