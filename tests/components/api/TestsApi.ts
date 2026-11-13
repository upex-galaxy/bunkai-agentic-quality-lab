/**
 * KATA Architecture - Layer 3: Tests API Component
 *
 * API component for BK-666's Tests resource. Setup helpers only (no `@atc`):
 * the writes here seed the Project Tests list, they are not outcomes under
 * test. `seedTestWithChainSuccessfully` composes the chain the list reads
 * (story -> acceptance criterion -> ATCs -> Test -> tags) inside one Module,
 * so every ATC lands in that Module's Project.
 *
 * Endpoints (confirmed against the synced OpenAPI contract):
 * - POST /api/v1/modules/{id}/user-stories         - story to host the ATCs
 * - POST /api/v1/user-stories/{id}/acceptance-criteria - criterion an ATC anchors to
 * - POST /api/v1/atcs                              - one ATC of the chain
 * - POST /api/v1/tests                             - chain ATCs into a Test (Idempotency-Key required)
 * - PUT  /api/v1/tests/{id}/tags                   - replace the tag set
 *
 * Every helper fails fast: it asserts the success code so a broken seed
 * surfaces at the precondition, not as a confusing list assertion.
 */

import type { APIResponse } from '@playwright/test';
import type { CreateAtcPayload, CreateAtcResponse } from '@schemas/atc.types';
import type { CreateTestPayload, CreateTestResponse, SetTestTagsPayload, SetTestTagsResponse } from '@schemas/test.types';
import type { CreateAcceptanceCriterionPayload, CreateAcceptanceCriterionResponse, CreateUserStoryPayload, CreateUserStoryResponse } from '@schemas/userStory.types';
import type { TestContextOptions } from '@TestContext';

import { randomUUID } from 'node:crypto';

import { ApiBase } from '@api/ApiBase';
import { expect } from '@playwright/test';
import { step } from '@utils/decorators';

// ============================================
// Types
// ============================================

export interface CreateUserStoryArgs {
  moduleId: string
  payload: CreateUserStoryPayload
}

export interface CreateAcceptanceCriterionArgs {
  userStoryId: string
  payload: CreateAcceptanceCriterionPayload
}

export interface SetTestTagsArgs {
  testId: string
  payload: SetTestTagsPayload
}

export interface SeedTestWithChainArgs {
  /** Workspace the Test binds to (passed explicitly) */
  workspaceId: string
  /** Module whose Project hosts the chain */
  moduleId: string
  /** Test title (1-200 chars) */
  title: string
  /** One ATC title per chain position, in order */
  chainAtcTitles: string[]
  /** Optional tag set, applied after the Test exists */
  tags?: string[]
}

// ============================================
// Tests API Component
// ============================================

export class TestsApi extends ApiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers - Setup only (no @atc)
  // ============================================

  /**
   * Helper: create a User Story in a Module. Fails fast (asserts 201).
   */
  @step
  async createUserStorySuccessfully(args: CreateUserStoryArgs): Promise<[APIResponse, CreateUserStoryResponse]> {
    // The live server answers 400 `idempotency_key_required` without the header,
    // although the synced OpenAPI declares none for this path (see the BK-666 report).
    const [response, body] = await this.apiPOST<CreateUserStoryResponse, CreateUserStoryPayload>(
      `/v1/modules/${args.moduleId}/user-stories`,
      args.payload,
      { headers: { 'Idempotency-Key': randomUUID() } },
    );
    expect(response.status(), `create user story failed: ${JSON.stringify(body)}`).toBe(201);
    return [response, body];
  }

  /**
   * Helper: add an acceptance criterion to a User Story. Fails fast (asserts 201).
   */
  @step
  async createAcceptanceCriterionSuccessfully(args: CreateAcceptanceCriterionArgs): Promise<[APIResponse, CreateAcceptanceCriterionResponse]> {
    const [response, body] = await this.apiPOST<CreateAcceptanceCriterionResponse, CreateAcceptanceCriterionPayload>(
      `/v1/user-stories/${args.userStoryId}/acceptance-criteria`,
      args.payload,
      { headers: { 'Idempotency-Key': randomUUID() } },
    );
    expect(response.status()).toBe(201);
    return [response, body];
  }

  /**
   * Helper: create one ATC in a Module, anchored to a User Story and at least
   * one of its acceptance criteria. Fails fast (asserts 201).
   */
  @step
  async createAtcSuccessfully(payload: CreateAtcPayload): Promise<[APIResponse, CreateAtcResponse]> {
    const [response, body] = await this.apiPOST<CreateAtcResponse, CreateAtcPayload>(
      '/v1/atcs',
      payload,
      { headers: { 'Idempotency-Key': randomUUID() } },
    );
    expect(response.status()).toBe(201);
    return [response, body];
  }

  /**
   * Helper: chain ATCs into a Test in the given Workspace. Idempotency-Key is
   * required by the endpoint, so each call gets a fresh one. Fails fast (201).
   */
  @step
  async createTestSuccessfully(payload: CreateTestPayload): Promise<[APIResponse, CreateTestResponse]> {
    const [response, body] = await this.apiPOST<CreateTestResponse, CreateTestPayload>(
      '/v1/tests',
      payload,
      { headers: { 'Idempotency-Key': randomUUID() } },
    );
    expect(response.status()).toBe(201);
    return [response, body];
  }

  /**
   * Helper: replace a Test's whole tag set (PUT semantics). Fails fast (asserts 200).
   */
  @step
  async setTestTagsSuccessfully(args: SetTestTagsArgs): Promise<[APIResponse, SetTestTagsResponse]> {
    const [response, body] = await this.apiPUT<SetTestTagsResponse, SetTestTagsPayload>(
      `/v1/tests/${args.testId}/tags`,
      args.payload,
    );
    expect(response.status()).toBe(200);
    return [response, body];
  }

  /**
   * Helper: seed a Test whose chain is one ATC per entry of `chainAtcTitles`,
   * optionally tagged. Composition of the calls above: story -> acceptance
   * criterion -> ATCs (in order) -> Test -> tags (only when given). The chain
   * length is the array length, so a test that needs its ATC title (BK-1578)
   * passes the title in and never re-derives it.
   *
   * @param args - seed description (see `SeedTestWithChainArgs`)
   */
  @step
  async seedTestWithChainSuccessfully(args: SeedTestWithChainArgs): Promise<[APIResponse, CreateTestResponse]> {
    const [, story] = await this.createUserStorySuccessfully({
      moduleId: args.moduleId,
      payload: { title: `Story for ${args.title}` },
    });
    const [, criterion] = await this.createAcceptanceCriterionSuccessfully({
      userStoryId: story.user_story.id,
      payload: { title: `Criterion for ${args.title}` },
    });

    const atcIds: string[] = [];
    for (const atcTitle of args.chainAtcTitles) {
      const [, atc] = await this.createAtcSuccessfully({
        title: atcTitle,
        module_id: args.moduleId,
        user_story_id: story.user_story.id,
        acceptance_criterion_ids: [criterion.acceptance_criterion.id],
        layer: 'UI',
        steps: [{ position: 1, content: `Run ${atcTitle}` }],
      });
      atcIds.push(atc.atc.id);
    }

    const [testResponse, test] = await this.createTestSuccessfully({
      title: args.title,
      atc_ids: atcIds,
      workspace_id: args.workspaceId,
    });

    if (args.tags && args.tags.length > 0) {
      await this.setTestTagsSuccessfully({ testId: test.test.id, payload: { tags: args.tags } });
    }

    return [testResponse, test];
  }
}
