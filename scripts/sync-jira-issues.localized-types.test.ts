import { describe, expect, test } from 'bun:test';

import { loadRegistry } from './sync-jira-issues.ts';

// The live instance returns localized issue-type names on issue payloads while the
// workflow catalog keeps the English ones. A registry that does not resolve the
// localized spelling discards the issue before reading a single field (BK-502:
// `get BK-502 --include-comments` synced 0 files for every Bug and Improvement).
// These assertions pin the project's live names to the work types that must route
// them, reading the project's own `.agents/jira-required.yaml`.
describe('project registry — localized issue type names', () => {
  const registry = loadRegistry();

  test('routes the localized Bug name "Error" to the bug work type', () => {
    expect(registry.byJiraType.get('Bug')?.slug).toBe('bug');
    expect(registry.byJiraType.get('Error')?.slug).toBe('bug');
    expect(registry.canonicalType.get('Error')).toBe('Bug');
  });

  test('routes the localized Improvement name "Mejora" to the improvement work type', () => {
    expect(registry.byJiraType.get('Improvement')?.slug).toBe('improvement');
    expect(registry.byJiraType.get('Mejora')?.slug).toBe('improvement');
    expect(registry.canonicalType.get('Mejora')).toBe('Improvement');
  });

  test('every declared alias resolves back to its own work type', () => {
    for (const entry of registry.list) {
      for (const alias of entry.jiraIssueTypeAliases) {
        expect(registry.byJiraType.get(alias)).toBe(entry);
      }
    }
  });
});
