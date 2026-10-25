/**
 * KATA Architecture - Layer 3: Bugs API Component
 *
 * Setup-only helpers for BK-258's Home open-bugs tests: file a standalone bug
 * and advance its status. No `@atc` here: these writes have no Jira Test of
 * their own (same precedent as `ProjectsApi.createProjectSuccessfully`).
 *
 * Endpoints:
 * - POST /api/v1/bugs              - standalone create (always starts `open`;
 *                                    Idempotency-Key header required)
 * - POST /api/v1/bugs/{id}/status  - one lifecycle stage forward per call
 */

import type { APIResponse } from '@playwright/test';
import type { BugDetail, BugStandaloneCreateBody, CreateBugResponse } from '@schemas/bug.types';
import type { TestContextOptions } from '@TestContext';

import { randomUUID } from 'node:crypto';

import { ApiBase } from '@api/ApiBase';
import { expect } from '@playwright/test';
import { step } from '@utils/decorators';

// Re-export types for consumers that import from BugsApi
export type { BugDetail, BugStandaloneCreateBody, CreateBugResponse } from '@schemas/bug.types';

// ============================================
// Bugs API Component
// ============================================

export class BugsApi extends ApiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers - Setup only (no @atc)
  // ============================================

  /**
   * Helper: file a standalone bug. Fails fast (asserts 201 and `open`) so a
   * broken seed surfaces at the precondition.
   */
  @step
  async createBugSuccessfully(
    payload: BugStandaloneCreateBody,
  ): Promise<[APIResponse, CreateBugResponse]> {
    const [response, body] = await this.apiPOST<CreateBugResponse, BugStandaloneCreateBody>(
      '/v1/bugs',
      payload,
      { headers: { 'Idempotency-Key': randomUUID() } },
    );
    expect(response.status()).toBe(201);
    expect(body.bug.status).toBe('open');
    return [response, body];
  }

  /**
   * Helper: advance a bug exactly one lifecycle stage
   * (open -> in_progress -> resolved -> closed). Forward-only: callers needing
   * a later stage call this once per stage.
   */
  @step
  async advanceBugStatusSuccessfully(
    args: { bugId: string, status: BugDetail['status'] },
  ): Promise<[APIResponse, { bug: BugDetail }]> {
    const [response, body] = await this.apiPOST<{ bug: BugDetail }, { status: BugDetail['status'] }>(
      `/v1/bugs/${args.bugId}/status`,
      { status: args.status },
    );
    expect(response.status()).toBe(200);
    expect(body.bug.status).toBe(args.status);
    return [response, body];
  }
}
