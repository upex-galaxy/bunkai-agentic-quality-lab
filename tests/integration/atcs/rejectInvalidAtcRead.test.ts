/**
 * KATA Architecture - BK-595 Single-ATC Read Validation & Non-Disclosure Integration Test
 *
 * TC10 (BK-1377): unrecognised `expand` value returns 400 `bad_request`
 * (`details.reason = 'expand_invalid'`) and no partial payload.
 * TC11 (BK-1378): non-existent UUID returns uniform 404 `not_found`
 * (`details.reason = 'not_found'`) with only the error envelope.
 * TC12 (BK-1379): malformed ATC ids return 400 `bad_request` with only the
 * error envelope.
 *
 * Project: integration (depends on api-setup, no browser cookies)
 */

import { test } from '@TestFixture';

const VALID_ATC_ID = '11111712-d1f8-49bc-96f6-799f2b5a57cf';
const NON_EXISTENT_ATC_ID = '11111111-1111-4111-8111-111111111111';

interface MalformedIdRow {
  label: string
  id: string
}

const MALFORMED_ROWS: ReadonlyArray<MalformedIdRow> = [
  { label: 'a plain word', id: 'not-a-uuid' },
  { label: 'a dashless 32-hex string', id: '11111712d1f849bc96f6799f2b5a57cf' },
  { label: 'an id one character short of a UUID (35)', id: '11111712-d1f8-49bc-96f6-799f2b5a57c' },
  { label: 'an id one character longer than a UUID (37)', id: '11111712-d1f8-49bc-96f6-799f2b5a57cff' },
];

test.describe('BK-595: Read a single ATC by id (validation & non-disclosure)', { tag: ['@regression'] }, () => {
  test('BK-1377: should respond 400 bad_request naming the offending token when expand contains an unrecognised value', async ({ api }) => {
    await api.atcs.expectInvalidExpandRejected({
      atcId: VALID_ATC_ID,
      expand: 'steps,bogus',
      invalidToken: 'bogus',
    });
  });

  test('BK-1378: should respond 404 not_found with details.reason=not_found when the ATC UUID does not exist', async ({ api }) => {
    await api.atcs.expectAtcNotFound(NON_EXISTENT_ATC_ID);
  });

  for (const row of MALFORMED_ROWS) {
    test(`BK-1379: should respond 400 bad_request when the ATC id is ${row.label}`, async ({ api }) => {
      await api.atcs.expectMalformedAtcIdRejected(row.id);
    });
  }
});
