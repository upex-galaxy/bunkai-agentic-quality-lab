/**
 * KATA Architecture - BK-258 Home Open Bugs Card: archived-module exclusion
 *
 * TC3 (BK-1095): after the module holding two open P1 bugs is archived, the
 * Home "Open bugs" card drops those bugs (total -2, P1 -2) while the P2 bug in
 * the still-active module keeps its count. EP on module state plus the
 * active -> archived transition, one ATC.
 *
 * The workspace is shared, so every expectation is a delta over a baseline read
 * right before seeding. The pre-archive API read proves the three seeded bugs
 * were counted, so the -2 cannot pass vacuously.
 *
 * `clearAuthToken()` makes every API call use the session cookie, the same
 * identity the browser renders. Cleanup archives both modules: bugs of an
 * archived module drop out of the open count, which restores the baseline.
 *
 * Project: e2e (depends on ui-setup)
 */

import type { ApiFixture } from '@ApiFixture';

import { expect, test } from '@TestFixture';

async function archiveQuietly(args: { api: ApiFixture, moduleId: string | undefined, label: string }): Promise<void> {
  const { api, moduleId, label } = args;
  if (!moduleId) {
    return;
  }
  try {
    await api.projects.archiveModuleSuccessfully(moduleId);
  }
  catch (error) {
    console.warn(`[BK-1095] cleanup failed, archive ${label} module ${moduleId} manually: ${error instanceof Error ? error.message : String(error)}`);
  }
}

test.describe('BK-258: Home open bugs card archived-module exclusion', { tag: ['@regression'] }, () => {
  test('BK-1095: should exclude open bugs from the count when their module is archived', async ({ test: fixture }) => {
    const { api, ui } = fixture;
    fixture.clearAuthToken();

    const [, me] = await api.auth.getCurrentUser();
    const workspaceId = me.active_workspace_id;
    expect(workspaceId).toBeTruthy();

    const [, baseline] = await api.openBugs.getOpenBugs(workspaceId!);

    // Projects cannot be deleted and the existing QA project is ranked out of
    // `recent-projects` (max 20), so create one per run; no project-list endpoint.
    const [, project] = await api.projects.createProjectSuccessfully(
      workspaceId!,
      api.data.createProject({ name: `BK-258 QA archive ${api.data.createTestId('exclusion')}` }),
    );
    const projectId = project.project.id;

    let activeModuleId: string | undefined;
    let archivedModuleId: string | undefined;
    let archiveCompleted = false;

    try {
      const [, activeModule] = await api.projects.createModuleSuccessfully({
        projectId,
        payload: api.data.createModule(),
      });
      activeModuleId = activeModule.module.id;

      const [, archivedModule] = await api.projects.createModuleSuccessfully({
        projectId,
        payload: api.data.createModule(),
      });
      archivedModuleId = archivedModule.module.id;

      // Active-module control: 1 open P2 bug. Archived module: 2 open P1 bugs.
      await api.bugs.createBugSuccessfully({
        project_id: projectId,
        module_id: activeModule.module.id,
        ...api.data.createBug({ severity: 'P2' }),
      });
      for (let i = 0; i < 2; i++) {
        await api.bugs.createBugSuccessfully({
          project_id: projectId,
          module_id: archivedModule.module.id,
          ...api.data.createBug({ severity: 'P1' }),
        });
      }

      // The TC's "counts before archiving noted": prove the 3 seeded bugs were counted.
      const [, before] = await api.openBugs.getOpenBugs(workspaceId!);
      expect(before.open_count).toBe(baseline.open_count + 3);
      expect(before.by_severity.P1).toBe(baseline.by_severity.P1 + 2);
      expect(before.by_severity.P2).toBe(baseline.by_severity.P2 + 1);

      // ACTION: archive the module that holds the two P1 bugs.
      await api.projects.archiveModuleSuccessfully(archivedModule.module.id);
      archiveCompleted = true;

      const expected = {
        total: before.open_count - 2,
        P1: before.by_severity.P1 - 2,
        P2: before.by_severity.P2,
      };

      await ui.home.open();
      await ui.home.showsOpenBugCountsExcludingArchivedModule(expected);

      // The card matched `expected`; the server must agree.
      const [, after] = await api.openBugs.getOpenBugs(workspaceId!);
      expect(after.open_count).toBe(expected.total);
      expect(after.by_severity.P1).toBe(expected.P1);
      expect(after.by_severity.P2).toBe(expected.P2);
    }
    finally {
      // Cleanup must never replace the in-flight failure: warn and move on.
      await archiveQuietly({ api, moduleId: activeModuleId, label: 'active' });
      if (!archiveCompleted) {
        await archiveQuietly({ api, moduleId: archivedModuleId, label: 'archived' });
      }

      try {
        const [, afterCleanup] = await api.openBugs.getOpenBugs(workspaceId!);
        if (afterCleanup.open_count !== baseline.open_count) {
          console.warn(`[BK-1095] workspace did not return to its baseline: before=${baseline.open_count} after=${afterCleanup.open_count}`);
        }
      }
      catch (error) {
        console.warn(`[BK-1095] cleanup baseline re-read failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
});
