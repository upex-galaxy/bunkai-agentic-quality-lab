/**
 * KATA Architecture - BK-258 Home Open Bugs Card: workspace scope
 *
 * TC7 (BK-1099): the Home "Open bugs" card counts only the active workspace's
 * bugs when the user belongs to two workspaces with open bugs. EP on workspace
 * (active vs other member workspace), one parameterized ATC over two rows.
 *
 * Both workspaces are created per run, so they start empty and every count is
 * absolute (no baseline, no delta, nothing shared to clean up). Only B holds a
 * P4 bug and only A holds a P1 bug: each must read 0 on the other's card. The
 * API oracle proves both seeds before the first card read, so the test cannot
 * pass vacuously.
 *
 * `clearAuthToken()` makes every API call use the session cookie, the same
 * identity the browser renders. Workspaces cannot be deleted: two stay per run.
 *
 * Project: e2e (depends on ui-setup)
 */

import type { ApiFixture } from '@ApiFixture';
import type { OpenBugsCounts } from '@data/types';

import { expect, test } from '@TestFixture';

type Severity = 'P1' | 'P2' | 'P3' | 'P4';

const SEED: Record<'A' | 'B', Severity[]> = {
  A: ['P1', 'P2'], // the only P1: must never reach B's card
  B: ['P2', 'P4'], // the only P4: must never reach A's card
};

function countsOf(severities: Severity[]): OpenBugsCounts {
  const counts: OpenBugsCounts = { total: severities.length, P1: 0, P2: 0, P3: 0, P4: 0 };
  for (const severity of severities) {
    counts[severity]++;
  }
  return counts;
}

async function seedWorkspace(args: { api: ApiFixture, severities: Severity[] }): Promise<string> {
  const { api, severities } = args;
  const [, created] = await api.projects.createWorkspaceSuccessfully();
  const workspaceId = created.workspace.id;

  const [, project] = await api.projects.createProjectSuccessfully(
    workspaceId,
    api.data.createProject({ name: `BK-258 QA scope ${api.data.createTestId('workspace')}` }),
  );
  const [, module] = await api.projects.createModuleSuccessfully({
    projectId: project.project.id,
    payload: api.data.createModule(),
  });

  for (const severity of severities) {
    await api.bugs.createBugSuccessfully({
      project_id: project.project.id,
      module_id: module.module.id,
      ...api.data.createBug({ severity }),
    });
  }

  return workspaceId;
}

async function readCounts(api: ApiFixture, workspaceId: string): Promise<OpenBugsCounts> {
  const [, body] = await api.openBugs.getOpenBugs(workspaceId);
  return { total: body.open_count, ...body.by_severity };
}

test.describe('BK-258: Home open bugs card workspace scope', { tag: ['@regression'] }, () => {
  test('BK-1099: should count only the active workspace bugs when the user belongs to two workspaces with open bugs', async ({ test: fixture }) => {
    const { api, ui } = fixture;
    fixture.clearAuthToken();

    const workspaces = {
      A: await seedWorkspace({ api, severities: SEED.A }),
      B: await seedWorkspace({ api, severities: SEED.B }),
    };

    // Oracle: each workspace counts exactly its own seed (a bug seeded into the wrong workspace fails here).
    expect(await readCounts(api, workspaces.A)).toEqual(countsOf(SEED.A));
    expect(await readCounts(api, workspaces.B)).toEqual(countsOf(SEED.B));

    const rows = [
      { active: 'A', inactive: 'B' },
      { active: 'B', inactive: 'A' },
    ] as const;

    for (const { active, inactive } of rows) {
      await test.step(`${active} active, ${inactive} inactive`, async () => {
        const expected = countsOf(SEED[active]);

        await ui.home.selectWorkspace(workspaces[active]);
        await ui.home.open();
        await ui.home.showsOnlyActiveWorkspaceOpenBugs(expected);

        // The card matched `expected`; the server must agree.
        expect(await readCounts(api, workspaces[active])).toEqual(expected);
      });
    }
  });
});
