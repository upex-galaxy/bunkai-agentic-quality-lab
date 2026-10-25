/**
 * KATA Architecture - BK-258 Open-bugs API input-validation integration test
 *
 * TC10 (BK-1102): the workspace open-bugs read rejects a path id that is not a
 * UUID with 400 `bad_request` and leaks no aggregate. EP on the invalid
 * formats plus BVA at the UUID length boundary (35 / 37). One Playwright test
 * per row so every row gets its own fresh `api` request context and the `api`
 * fixture's default PAT is the only credential involved.
 *
 * Project: integration (depends on api-setup, no browser cookies)
 */

import { test } from '@TestFixture';

interface MalformedIdRow {
  label: string
  id: string
}

// EP: the invalid-format partitions (wrong characters / missing grouping).
const PLAIN_WORD: MalformedIdRow = { label: 'a plain word', id: 'not-a-uuid' };
const UNGROUPED_NUMERIC_STRING: MalformedIdRow = { label: 'an ungrouped numeric string', id: '1234567890' };

// BVA: the canonical UUID is exactly 36 characters; one short and one long.
const UUID_ONE_SHORT: MalformedIdRow = { label: 'an id one character short of a UUID (35)', id: '3f2504e0-4f89-11d3-9a0c-0305e82c330' };
const UUID_ONE_LONG: MalformedIdRow = { label: 'an id one character longer than a UUID (37)', id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301a' };

const ROWS: ReadonlyArray<MalformedIdRow> = [PLAIN_WORD, UNGROUPED_NUMERIC_STRING, UUID_ONE_SHORT, UUID_ONE_LONG];

test.describe('BK-258: Open-bugs API input validation', { tag: ['@regression'] }, () => {
  for (const row of ROWS) {
    test(`BK-1102: should respond 400 when the open-bugs read is called with ${row.label} as the workspace id`, async ({ api }) => {
      await api.openBugs.expectBadRequestForMalformedWorkspaceId(row.id);
    });
  }
});
