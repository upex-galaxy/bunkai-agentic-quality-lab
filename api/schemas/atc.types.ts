/**
 * KATA Framework - Type Facade: ATC Domain (BK-595)
 *
 * Types for `GET /api/v1/atcs/{id}` lean and expanded responses.
 *
 * Consumed by: tests/components/api/AtcsApi.ts, tests/components/api/TestsApi.ts
 */

import type { paths } from '@openapi';

export type AtcExpansionKey = 'steps' | 'assertions' | 'acceptance_criteria' | 'used_in';

export interface AtcStepItem {
  id?: string
  position: number
  content: string
  [key: string]: unknown
}

export interface AtcAssertionItem {
  id: string
  content: string
  position?: number
  [key: string]: unknown
}

export interface AtcAcceptanceCriterionItem {
  id: string
  user_story_id: string
  title: string
  description: string | null
  position: number
  archived_at: string | null
}

export interface AtcUsedInItem {
  id?: string
  test_id?: string
  title?: string
  [key: string]: unknown
}

export interface AtcResource {
  id: string
  slug?: string
  title: string
  layer?: string
  version: number
  module_id?: string
  user_story_id?: string
  project_id?: string
  created_at?: string
  updated_at?: string
  steps?: AtcStepItem[]
  assertions?: AtcAssertionItem[]
  acceptance_criteria?: AtcAcceptanceCriterionItem[]
  used_in?: AtcUsedInItem[]
  [key: string]: unknown
}

export interface AtcGetResponse {
  atc: AtcResource
}

// ============================================================================
// Endpoint Types - POST /api/v1/atcs
// ============================================================================

type CreateAtcPath = paths['/api/v1/atcs']['post'];
export type CreateAtcPayload = CreateAtcPath['requestBody']['content']['application/json'];
export type CreateAtcResponse = CreateAtcPath['responses'][201]['content']['application/json'];
