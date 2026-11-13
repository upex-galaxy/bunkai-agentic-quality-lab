/**
 * KATA Framework - Type Facade: User Story Domain
 *
 * Consumed by: tests/components/api/UserStoryApi.ts
 */

import type { components, paths } from '@openapi';

// ============================================================================
// Schema Types (from components.schemas)
// ============================================================================

export type UserStory = components['schemas']['UserStory'];

// ============================================================================
// Endpoint Types — GET /api/v1/user-stories/{id}
// ============================================================================

type GetUserStoryPath = paths['/api/v1/user-stories/{id}']['get'];
export type GetUserStoryResponse = GetUserStoryPath['responses']['200']['content']['application/json'];

// ============================================================================
// Endpoint Types — GET /api/v1/modules/{id}/user-stories
// ============================================================================

type ListUserStoriesPath = paths['/api/v1/modules/{id}/user-stories']['get'];
export type ListUserStoriesResponse = ListUserStoriesPath['responses']['200']['content']['application/json'];

// ============================================================================
// Endpoint Types — PATCH /api/v1/user-stories/{id}
// ============================================================================

type UpdateUserStoryPath = paths['/api/v1/user-stories/{id}']['patch'];
export type UpdateUserStoryPayload = UpdateUserStoryPath['requestBody']['content']['application/json'];
export type UpdateUserStoryResponse = UpdateUserStoryPath['responses']['200']['content']['application/json'];

// ============================================================================
// Endpoint Types - POST /api/v1/modules/{id}/user-stories
// ============================================================================

type CreateUserStoryPath = paths['/api/v1/modules/{id}/user-stories']['post'];
export type CreateUserStoryPayload = CreateUserStoryPath['requestBody']['content']['application/json'];
export type CreateUserStoryResponse = CreateUserStoryPath['responses'][201]['content']['application/json'];

// ============================================================================
// Endpoint Types - POST /api/v1/user-stories/{id}/acceptance-criteria
// ============================================================================

type CreateAcceptanceCriterionPath = paths['/api/v1/user-stories/{id}/acceptance-criteria']['post'];
export type CreateAcceptanceCriterionPayload = CreateAcceptanceCriterionPath['requestBody']['content']['application/json'];
export type CreateAcceptanceCriterionResponse = CreateAcceptanceCriterionPath['responses'][201]['content']['application/json'];
