/**
 * KATA Framework - Type Facade: Test Domain (BK-666)
 *
 * Types for the Tests resource writes the Project Tests list depends on:
 * `POST /api/v1/tests` (chain ATCs into a Test) and
 * `PUT /api/v1/tests/{id}/tags` (replace the tag set).
 *
 * Consumed by: tests/components/api/TestsApi.ts
 */

import type { paths } from '@openapi';

// ============================================================================
// Endpoint Types - POST /api/v1/tests
// ============================================================================

type CreateTestPath = paths['/api/v1/tests']['post'];
export type CreateTestPayload = CreateTestPath['requestBody']['content']['application/json'];
export type CreateTestResponse = CreateTestPath['responses'][201]['content']['application/json'];

// ============================================================================
// Endpoint Types - PUT /api/v1/tests/{id}/tags
// ============================================================================

type SetTestTagsPath = paths['/api/v1/tests/{id}/tags']['put'];
export type SetTestTagsPayload = SetTestTagsPath['requestBody']['content']['application/json'];
export type SetTestTagsResponse = SetTestTagsPath['responses'][200]['content']['application/json'];
