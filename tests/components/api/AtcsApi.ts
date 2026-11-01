/**
 * KATA Architecture - Layer 3: ATCs API Component
 *
 * API component for BK-595's single-ATC read endpoint
 * (`GET /api/v1/atcs/{id}`, Bearer `atc:read` or cookie session).
 */

import type { APIResponse } from '@playwright/test';
import type { AtcExpansionKey, AtcGetResponse, AtcResource } from '@schemas/atc.types';
import type { ErrorEnvelope } from '@schemas/auth.types';
import type { TestContextOptions } from '@TestContext';

import { ApiBase } from '@api/ApiBase';
import { expect } from '@playwright/test';
import { atc, step } from '@utils/decorators';

// Re-export types for consumers that import from AtcsApi
export type { AtcExpansionKey, AtcGetResponse, AtcResource } from '@schemas/atc.types';

const EXPANSION_KEYS: ReadonlyArray<AtcExpansionKey> = [
  'steps',
  'assertions',
  'acceptance_criteria',
  'used_in',
];

const FORBIDDEN_LEAN_KEYS: ReadonlyArray<string> = [
  ...EXPANSION_KEYS,
  'acceptance_criterion_ids',
];

// ============================================
// ATCs API Component
// ============================================

export class AtcsApi extends ApiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers - Read-only operations (no @atc)
  // ============================================

  /**
   * Helper: plain read of a single ATC with optional `expand` query string.
   */
  @step
  async getAtcById(args: { atcId: string, expand?: string }): Promise<[APIResponse, AtcGetResponse]> {
    const query = args.expand ? `?expand=${encodeURIComponent(args.expand)}` : '';
    const [response, body] = await this.apiGET<AtcGetResponse>(`/v1/atcs/${args.atcId}${query}`);
    return [response, body];
  }

  // ============================================
  // ATCs - Complete Test Cases (ACTION + VERIFICATION)
  // ============================================

  /**
   * ATC: Lean read of an ATC by ID returns 200 with header fields, omits all
   * four expansion collections, and sets `Cache-Control: private, no-store`.
   *
   * @param atcId - UUID of an accessible ATC in the workspace
   */
  @atc('BK-1368')
  async expectLeanAtcRead(atcId: string): Promise<[APIResponse, AtcGetResponse]> {
    const [response, body] = await this.apiGET<AtcGetResponse>(`/v1/atcs/${atcId}`);

    expect(response.status()).toBe(200);

    const cacheControl = response.headers()['cache-control'] ?? '';
    expect(cacheControl).toMatch(/private/);
    expect(cacheControl).toMatch(/no-store/);

    expect(Object.keys(body)).toEqual(['atc']);
    expect(body.atc.id).toBe(atcId);
    expect(typeof body.atc.title).toBe('string');
    expect(Number.isInteger(body.atc.version)).toBe(true);

    for (const forbiddenKey of FORBIDDEN_LEAN_KEYS) {
      expect(forbiddenKey in body.atc, `lean read must not include '${forbiddenKey}'`).toBe(false);
    }

    return [response, body];
  }

  /**
   * ATC: Reading an ATC with all four published expansions returns 200 and
   * includes `steps`, `assertions`, `acceptance_criteria`, and `used_in` as
   * arrays whose contents match single-expansion reads.
   *
   * @param atcId - UUID of an accessible ATC in the workspace
   */
  @atc('BK-1374')
  async expectExpandedAtcRead(atcId: string): Promise<[APIResponse, AtcGetResponse]> {
    const [response, body] = await this.apiGET<AtcGetResponse>(
      `/v1/atcs/${atcId}?expand=steps,assertions,acceptance_criteria,used_in`,
    );

    expect(response.status()).toBe(200);
    expect(Object.keys(body)).toEqual(['atc']);

    const resource: AtcResource = body.atc;
    expect(resource.id).toBe(atcId);

    for (const key of EXPANSION_KEYS) {
      expect(Array.isArray(resource[key]), `expected '${key}' to be an array`).toBe(true);
    }

    const steps = resource.steps ?? [];
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].position).toBeGreaterThanOrEqual(steps[i - 1].position);
    }

    const criteria = resource.acceptance_criteria ?? [];
    for (let i = 1; i < criteria.length; i++) {
      expect(criteria[i].position).toBeGreaterThanOrEqual(criteria[i - 1].position);
    }

    return [response, body];
  }

  /**
   * ATC: Requesting an unrecognised `expand` value is rejected with 400
   * `bad_request` (`details.reason = 'expand_invalid'`), naming the offending
   * token and leaking no partial ATC payload.
   *
   * @param args - target ATC id, raw expand string, and expected invalid token
   * @param args.atcId - valid UUID so validation reaches the expand parser
   * @param args.expand - query value for `expand`
   * @param args.invalidToken - token expected in the error message and details
   */
  @atc('BK-1377')
  async expectInvalidExpandRejected(
    args: { atcId: string, expand: string, invalidToken: string },
  ): Promise<[APIResponse, ErrorEnvelope]> {
    const [response, body] = await this.apiGET<ErrorEnvelope>(
      `/v1/atcs/${args.atcId}?expand=${encodeURIComponent(args.expand)}`,
    );

    expect(response.status()).toBe(400);
    expect(Object.keys(body)).toEqual(['error']);
    expect(body.error.code).toBe('bad_request');
    expect(body.error.message).toContain(args.invalidToken);
    expect(body.error.details).toMatchObject({
      reason: 'expand_invalid',
      value: args.invalidToken,
    });

    return [response, body];
  }

  /**
   * ATC: Reading a non-existent (or inaccessible) ATC UUID returns a uniform
   * 404 `not_found` with `details.reason = 'not_found'` and only the error
   * envelope.
   *
   * @param nonExistentAtcId - well-formed UUID that does not resolve to an ATC
   */
  @atc('BK-1378')
  async expectAtcNotFound(nonExistentAtcId: string): Promise<[APIResponse, ErrorEnvelope]> {
    const [response, body] = await this.apiGET<ErrorEnvelope>(`/v1/atcs/${nonExistentAtcId}`);

    expect(response.status()).toBe(404);
    expect(Object.keys(body)).toEqual(['error']);
    expect(body.error.code).toBe('not_found');
    expect(body.error.details).toMatchObject({ reason: 'not_found' });

    return [response, body];
  }

  /**
   * ATC: Reading an ATC with a path segment that fails the UUID format check
   * returns 400 `bad_request` with only the error envelope.
   *
   * @param malformedAtcId - path segment that is not a valid UUID
   */
  @atc('BK-1379')
  async expectMalformedAtcIdRejected(malformedAtcId: string): Promise<[APIResponse, ErrorEnvelope]> {
    const [response, body] = await this.apiGET<ErrorEnvelope>(`/v1/atcs/${malformedAtcId}`);

    expect(response.status()).toBe(400);
    expect(Object.keys(body)).toEqual(['error']);
    expect(body.error.code).toBe('bad_request');
    expect(body.error.message).toMatch(/atc id must be a uuid/i);

    return [response, body];
  }
}
