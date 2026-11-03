/**
 * KATA Architecture - BK-595 Single-ATC Read Access Integration Test
 *
 * TC19 (BK-1386): a PAT carrying only `atc:write` cannot read the ATC - 403
 * `forbidden` naming `atc:read`, error envelope only.
 * TC20 (BK-1387): a request with no credential is refused with 401
 * `unauthorized`, error envelope only.
 *
 * The credential is not a method parameter: each test sets it on the `api`
 * fixture and restores it in `finally`, so no neighbouring test inherits an
 * anonymous or write-only component.
 *
 * Project: integration (depends on api-setup, no browser cookies)
 */

import { test } from '@TestFixture';

/** Stable ATC in the staging QA workspace; the refusals never reach a lookup. */
const FIXTURE_ATC_ID = '06391422-2283-4688-995b-74f39f6cb564';

test.describe('BK-595: Read a single ATC by id (auth posture)', { tag: ['@regression'] }, () => {
  test('BK-1386: should refuse a write-only token with 403 naming atc:read and return no ATC data', async ({ api }) => {
    const savedToken = api.authToken;
    const pat = await api.auth.mintScopedPat({ scopes: ['atc:write'] });

    try {
      api.setAuthToken(pat.token);

      await api.atcs.expectReadRefusedForMissingCapability(FIXTURE_ATC_ID);
    }
    finally {
      restoreToken(api.setAuthToken.bind(api), api.clearAuthToken.bind(api), savedToken);
      await pat.revoke();
    }
  });

  test('BK-1387: should refuse an unauthenticated request with 401 and return no ATC data', async ({ api }) => {
    const savedToken = api.authToken; // the api-setup PAT loaded by the fixture

    try {
      api.clearAuthToken();

      await api.atcs.expectReadRefusedForAnonymousCaller(FIXTURE_ATC_ID);
    }
    finally {
      restoreToken(api.setAuthToken.bind(api), api.clearAuthToken.bind(api), savedToken);
    }
  });
});

/** Put the credential the fixture loaded back on the component. */
function restoreToken(
  setToken: (token: string) => void,
  clearToken: () => void,
  token: string | null,
): void {
  if (token) {
    setToken(token);
  }
  else {
    clearToken();
  }
}
