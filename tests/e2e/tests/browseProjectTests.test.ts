/**
 * KATA Architecture - BK-666 Project Tests list, browse / filter / sort
 *
 * One test per ATC: BK-1560 (sub-nav entry), BK-1562 and BK-1570 (Project
 * scoping, plain and through the tag filter), BK-1566 (row fields), BK-1569
 * (tag filter and N of M count), BK-1573 (no-match state), BK-1574 (Name sort),
 * BK-1578 (row opens the Test detail).
 *
 * Every test seeds its own data through the API and then drives the browser.
 * Each test creates a Workspace of its own: projects and Tests cannot be
 * deleted, so isolation comes from a fresh Workspace per test, not cleanup
 * (accepted staging residue, same pattern as BK-266). `clearAuthToken()` makes
 * API calls use the session cookie, the identity the browser renders.
 *
 * Project: e2e (depends on ui-setup)
 */

import { test } from '@TestFixture';

test.describe('BK-666: Project Tests list', { tag: ['@critical'] }, () => {
  test('BK-666: should list a Tests entry in the project sub-nav and open the list when clicked', async ({ test: fixture }) => {
    const { ui, api } = fixture;
    fixture.clearAuthToken();

    const [, workspace] = await api.projects.createWorkspaceSuccessfully();
    const workspaceId = workspace.workspace.id;
    await ui.projects.selectWorkspace(workspaceId);

    const [, project] = await api.projects.createProjectSuccessfully(workspaceId, ui.data.createProject());
    const [, createdModule] = await api.projects.createModuleSuccessfully({
      projectId: project.project.id,
      payload: ui.data.createModule(),
    });
    await api.tests.seedTestWithChainSuccessfully({
      workspaceId,
      moduleId: createdModule.module.id,
      title: ui.data.createTestId('BK-666-entry'),
      chainAtcTitles: [ui.data.createTestId('BK-666-entry-atc')],
    });

    await ui.projectTests.openFromSubNavMarksTestsCurrent(project.project.slug);
  });

  test('BK-666: should list only the current Project\'s own Tests given two Projects each holding its own', async ({ test: fixture }) => {
    const { ui, api } = fixture;
    fixture.clearAuthToken();

    const [, workspace] = await api.projects.createWorkspaceSuccessfully();
    const workspaceId = workspace.workspace.id;
    await ui.projects.selectWorkspace(workspaceId);

    const [, first] = await api.projects.createProjectSuccessfully(workspaceId, ui.data.createProject());
    const [, firstModule] = await api.projects.createModuleSuccessfully({
      projectId: first.project.id,
      payload: ui.data.createModule(),
    });
    const ownA1 = ui.data.createTestId('BK-666-own-a1');
    const ownA2 = ui.data.createTestId('BK-666-own-a2');
    await api.tests.seedTestWithChainSuccessfully({
      workspaceId,
      moduleId: firstModule.module.id,
      title: ownA1,
      chainAtcTitles: [ui.data.createTestId('BK-666-own-a1-atc')],
    });
    await api.tests.seedTestWithChainSuccessfully({
      workspaceId,
      moduleId: firstModule.module.id,
      title: ownA2,
      chainAtcTitles: [ui.data.createTestId('BK-666-own-a2-atc')],
    });

    const [, second] = await api.projects.createProjectSuccessfully(workspaceId, ui.data.createProject());
    const [, secondModule] = await api.projects.createModuleSuccessfully({
      projectId: second.project.id,
      payload: ui.data.createModule(),
    });
    const ownB1 = ui.data.createTestId('BK-666-own-b1');
    await api.tests.seedTestWithChainSuccessfully({
      workspaceId,
      moduleId: secondModule.module.id,
      title: ownB1,
      chainAtcTitles: [ui.data.createTestId('BK-666-own-b1-atc')],
    });

    await ui.projectTests.open(first.project.slug);
    await ui.projectTests.listsOnlyCurrentProjectTests({
      slug: first.project.slug,
      ownTitles: [ownA1, ownA2],
      foreignTitles: [ownB1],
    });

    await ui.projectTests.open(second.project.slug);
    await ui.projectTests.listsOnlyCurrentProjectTests({
      slug: second.project.slug,
      ownTitles: [ownB1],
      foreignTitles: [ownA1, ownA2],
    });
  });

  test('BK-666: should show name, chain length, tags and created date on every row', async ({ test: fixture }) => {
    const { ui, api } = fixture;
    fixture.clearAuthToken();

    const [, workspace] = await api.projects.createWorkspaceSuccessfully();
    const workspaceId = workspace.workspace.id;
    await ui.projects.selectWorkspace(workspaceId);

    const [, project] = await api.projects.createProjectSuccessfully(workspaceId, ui.data.createProject());
    const [, createdModule] = await api.projects.createModuleSuccessfully({
      projectId: project.project.id,
      payload: ui.data.createModule(),
    });

    const longTitle = ui.data.createTestId('BK-666-long');
    const [, longSeed] = await api.tests.seedTestWithChainSuccessfully({
      workspaceId,
      moduleId: createdModule.module.id,
      title: longTitle,
      chainAtcTitles: Array.from({ length: 7 }, (_, index) => ui.data.createTestId(`BK-666-long-atc-${index + 1}`)),
      tags: ['smoke'],
    });

    const shortTitle = ui.data.createTestId('BK-666-short');
    const [, shortSeed] = await api.tests.seedTestWithChainSuccessfully({
      workspaceId,
      moduleId: createdModule.module.id,
      title: shortTitle,
      chainAtcTitles: [ui.data.createTestId('BK-666-short-atc')],
    });

    await ui.projectTests.open(project.project.slug);
    await ui.projectTests.rowsShowNameChainCountTagsAndCreatedDay([
      {
        testId: longSeed.test.id,
        title: longTitle,
        chainLength: 7,
        tags: ['smoke'],
        createdDay: new Date(longSeed.test.created_at).toISOString().slice(0, 10),
      },
      {
        testId: shortSeed.test.id,
        title: shortTitle,
        chainLength: 1,
        tags: [],
        createdDay: new Date(shortSeed.test.created_at).toISOString().slice(0, 10),
      },
    ]);
  });

  test('BK-666: should narrow the list through the shared tag control and state N of M Tests carry the tag', async ({ test: fixture }) => {
    const { ui, api } = fixture;
    fixture.clearAuthToken();

    const [, workspace] = await api.projects.createWorkspaceSuccessfully();
    const workspaceId = workspace.workspace.id;
    await ui.projects.selectWorkspace(workspaceId);

    const [, project] = await api.projects.createProjectSuccessfully(workspaceId, ui.data.createProject());
    const [, createdModule] = await api.projects.createModuleSuccessfully({
      projectId: project.project.id,
      payload: ui.data.createModule(),
    });

    const taggedTitle = ui.data.createTestId('BK-666-tagged');
    await api.tests.seedTestWithChainSuccessfully({
      workspaceId,
      moduleId: createdModule.module.id,
      title: taggedTitle,
      chainAtcTitles: [ui.data.createTestId('BK-666-tagged-atc')],
      tags: ['smoke'],
    });
    await api.tests.seedTestWithChainSuccessfully({
      workspaceId,
      moduleId: createdModule.module.id,
      title: ui.data.createTestId('BK-666-untagged'),
      chainAtcTitles: [ui.data.createTestId('BK-666-untagged-atc')],
    });

    await ui.projectTests.open(project.project.slug);
    await ui.projectTests.tagFilterNarrowsListAndStatesCount({
      tag: 'smoke',
      matchingTitles: [taggedTitle],
      total: 2,
    });
  });

  test('BK-666: should keep the list Project-scoped when the typed tag also matches Tests in other Projects', async ({ test: fixture }) => {
    const { ui, api } = fixture;
    fixture.clearAuthToken();

    const [, workspace] = await api.projects.createWorkspaceSuccessfully();
    const workspaceId = workspace.workspace.id;
    await ui.projects.selectWorkspace(workspaceId);

    const [, first] = await api.projects.createProjectSuccessfully(workspaceId, ui.data.createProject());
    const [, firstModule] = await api.projects.createModuleSuccessfully({
      projectId: first.project.id,
      payload: ui.data.createModule(),
    });
    const p1Tagged = ui.data.createTestId('BK-666-p1-tagged');
    await api.tests.seedTestWithChainSuccessfully({
      workspaceId,
      moduleId: firstModule.module.id,
      title: p1Tagged,
      chainAtcTitles: [ui.data.createTestId('BK-666-p1-tagged-atc')],
      tags: ['smoke'],
    });
    await api.tests.seedTestWithChainSuccessfully({
      workspaceId,
      moduleId: firstModule.module.id,
      title: ui.data.createTestId('BK-666-p1-plain'),
      chainAtcTitles: [ui.data.createTestId('BK-666-p1-plain-atc')],
    });

    const [, second] = await api.projects.createProjectSuccessfully(workspaceId, ui.data.createProject());
    const [, secondModule] = await api.projects.createModuleSuccessfully({
      projectId: second.project.id,
      payload: ui.data.createModule(),
    });
    const p2Tagged = ui.data.createTestId('BK-666-p2-tagged');
    await api.tests.seedTestWithChainSuccessfully({
      workspaceId,
      moduleId: secondModule.module.id,
      title: p2Tagged,
      chainAtcTitles: [ui.data.createTestId('BK-666-p2-tagged-atc')],
      tags: ['smoke'],
    });

    await ui.projectTests.open(first.project.slug);
    await ui.projectTests.tagFilterKeepsListProjectScoped({
      tag: 'smoke',
      expectedTitles: [p1Tagged],
      foreignTitles: [p2Tagged],
    });
  });

  test('BK-666: should show a distinct No Test carries this tag state with a Clear action given a tag matching nothing', async ({ test: fixture }) => {
    const { ui, api } = fixture;
    fixture.clearAuthToken();

    const [, workspace] = await api.projects.createWorkspaceSuccessfully();
    const workspaceId = workspace.workspace.id;
    await ui.projects.selectWorkspace(workspaceId);

    const [, project] = await api.projects.createProjectSuccessfully(workspaceId, ui.data.createProject());
    const [, createdModule] = await api.projects.createModuleSuccessfully({
      projectId: project.project.id,
      payload: ui.data.createModule(),
    });
    await api.tests.seedTestWithChainSuccessfully({
      workspaceId,
      moduleId: createdModule.module.id,
      title: ui.data.createTestId('BK-666-smoke-only'),
      chainAtcTitles: [ui.data.createTestId('BK-666-smoke-only-atc')],
      tags: ['smoke'],
    });

    await ui.projectTests.open(project.project.slug);
    await ui.projectTests.showsNoMatchStateWithClear('nightly');
  });

  test('BK-666: should sort by Name ascending and reverse the order on a second click', async ({ test: fixture }) => {
    const { ui, api } = fixture;
    fixture.clearAuthToken();

    const [, workspace] = await api.projects.createWorkspaceSuccessfully();
    const workspaceId = workspace.workspace.id;
    await ui.projects.selectWorkspace(workspaceId);

    const [, project] = await api.projects.createProjectSuccessfully(workspaceId, ui.data.createProject());
    const [, createdModule] = await api.projects.createModuleSuccessfully({
      projectId: project.project.id,
      payload: ui.data.createModule(),
    });

    // Seeded out of name order, so the default (newest first) order is not the one asserted.
    const alpha = ui.data.createTestId('Alpha');
    const bravo = ui.data.createTestId('Bravo');
    const charlie = ui.data.createTestId('Charlie');
    for (const title of [charlie, alpha, bravo]) {
      await api.tests.seedTestWithChainSuccessfully({
        workspaceId,
        moduleId: createdModule.module.id,
        title,
        chainAtcTitles: [ui.data.createTestId(`${title}-atc`)],
      });
    }

    await ui.projectTests.open(project.project.slug);
    await ui.projectTests.sortsByNameAscendingThenReverses([alpha, bravo, charlie]);
  });

  test('BK-666: should open a Test\'s own detail view from its row with the chain as reached from the explorer', async ({ test: fixture }) => {
    const { ui, api } = fixture;
    fixture.clearAuthToken();

    const [, workspace] = await api.projects.createWorkspaceSuccessfully();
    const workspaceId = workspace.workspace.id;
    await ui.projects.selectWorkspace(workspaceId);

    const [, project] = await api.projects.createProjectSuccessfully(workspaceId, ui.data.createProject());
    const [, createdModule] = await api.projects.createModuleSuccessfully({
      projectId: project.project.id,
      payload: ui.data.createModule(),
    });

    const checkoutTitle = ui.data.createTestId('BK-666-checkout');
    const chainAtcTitle = ui.data.createTestId('BK-666-checkout-atc');
    const [, checkout] = await api.tests.seedTestWithChainSuccessfully({
      workspaceId,
      moduleId: createdModule.module.id,
      title: checkoutTitle,
      chainAtcTitles: [chainAtcTitle],
    });

    await ui.projectTests.open(project.project.slug);
    await ui.projectTests.rowOpensTestDetailView({
      slug: project.project.slug,
      testId: checkout.test.id,
      title: checkoutTitle,
      chainAtcTitle,
    });
  });
});
