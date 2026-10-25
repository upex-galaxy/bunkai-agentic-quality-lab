/**
 * KATA Architecture - Layer 3: Projects API Component
 *
 * API component for BK-266's Projects module — currently a single SETUP
 * helper, not an ATC surface. `createProjectSuccessfully` seeds precondition
 * projects for the UI-driven list ATCs (BK-604/605/607) via the real
 * endpoint the product's own create-project form calls
 * (`POST /api/v1/workspaces/{id}/projects` — confirmed against
 * app/(app)/projects/create-project-form.tsx on origin/staging).
 *
 * No `@atc` here: the write has no dedicated Jira Test of its own — BK-609
 * (create-from-dedicated-route) is a UI ATC on ProjectsPage, since the AC it
 * covers is specifically about the UI flow, not API-level creation.
 *
 * `createWorkspaceSuccessfully` exists because projects cannot be deleted: the
 * shared staging workspace reached the 1000-row read cap of the Projects index
 * and a newly created project stopped appearing in it. Tests that read the
 * index seed and read inside a workspace of their own instead.
 */

import type { APIResponse } from '@playwright/test';
import type { ArchiveModuleResponse, CreateModulePayload, CreateModuleResponse, CreateProjectPayload, CreateProjectResponse, CreateWorkspacePayload, CreateWorkspaceResponse } from '@schemas/project.types';
import type { TestContextOptions } from '@TestContext';

import { randomUUID } from 'node:crypto';

import { ApiBase } from '@api/ApiBase';
import { expect } from '@playwright/test';
import { step } from '@utils/decorators';

// Re-export types for consumers that import from ProjectsApi
export type { ArchiveModuleResponse, CreateModulePayload, CreateModuleResponse, CreateProjectPayload, CreateProjectResponse, CreateWorkspacePayload, CreateWorkspaceResponse } from '@schemas/project.types';

// ============================================
// Projects API Component
// ============================================

export class ProjectsApi extends ApiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers - Setup only (no @atc)
  // ============================================

  /**
   * Helper: create a fresh workspace (the caller becomes its owner) with a
   * unique name and slug. Fails fast (asserts 201). Workspaces cannot be
   * deleted, so call it once per test that needs an empty, isolated index.
   */
  @step
  async createWorkspaceSuccessfully(): Promise<[APIResponse, CreateWorkspaceResponse]> {
    const slug = `qa-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
    const [response, body] = await this.apiPOST<CreateWorkspaceResponse, CreateWorkspacePayload>(
      '/v1/workspaces',
      { name: `BK-266 QA ${slug}`, slug },
      { headers: { 'Idempotency-Key': randomUUID() } },
    );
    expect(response.status()).toBe(201);
    return [response, body];
  }

  /**
   * Helper: seed a Project in the given workspace.
   *
   * Setup-only write — used to precondition the Projects-index list ATCs.
   * Fails fast (asserts 201) so a broken seed surfaces at the precondition,
   * not as a confusing downstream assertion failure in the ATC it feeds.
   */
  @step
  async createProjectSuccessfully(
    workspaceId: string,
    payload: CreateProjectPayload,
  ): Promise<[APIResponse, CreateProjectResponse]> {
    const [response, body] = await this.apiPOST<CreateProjectResponse, CreateProjectPayload>(
      `/v1/workspaces/${workspaceId}/projects`,
      payload,
      { headers: { 'Idempotency-Key': randomUUID() } },
    );
    expect(response.status()).toBe(201);
    return [response, body];
  }

  /**
   * Helper: seed a Module under a project (BK-258 Home open-bugs data).
   * Fails fast (asserts 201).
   */
  @step
  async createModuleSuccessfully(
    args: { projectId: string, payload: CreateModulePayload },
  ): Promise<[APIResponse, CreateModuleResponse]> {
    const [response, body] = await this.apiPOST<CreateModuleResponse, CreateModulePayload>(
      `/v1/projects/${args.projectId}/modules`,
      args.payload,
    );
    expect(response.status()).toBe(201);
    return [response, body];
  }

  /**
   * Helper: archive a module and its subtree (soft delete). Cleanup for tests
   * that seed bugs: bugs of an archived module drop out of the open-bugs count.
   * Fails fast (asserts 200).
   */
  @step
  async archiveModuleSuccessfully(moduleId: string): Promise<[APIResponse, ArchiveModuleResponse]> {
    const [response, body] = await this.apiDELETE<ArchiveModuleResponse>(`/v1/modules/${moduleId}`);
    expect(response.status()).toBe(200);
    return [response, body];
  }
}
