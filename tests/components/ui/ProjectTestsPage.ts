/**
 * KATA Architecture - Layer 3: Project Tests Page Component
 *
 * UI component for BK-666: the Project Tests list (`/projects/{slug}/tests`),
 * the sub-nav entry that reaches it, the shared tag filter and its count, the
 * no-match state, Name sort, and the row-to-detail navigation.
 *
 * Locators (data-testid, measured live on staging during Stage 2, 2026-11-05;
 * the list is not in the local checkout, so each selector was observed, not read):
 * - Sub-nav Tests entry:  [data-testid="project-subnav-tests"]
 * - List root:            [data-testid="tests-list"]
 * - Count copy:           [data-testid="tests-list-count"]
 * - Table:                [data-testid="tests-list-table"]
 * - Row:                  [data-testid="tests-list-row-{testId}"]
 * - Row open control:     [data-testid="tests-list-open-{testId}"]
 * - Sort headers:         [data-testid="tests-list-sort-name|chain|created"]
 * - Tag filter:           [data-testid="test-tag-filter"]
 * - No-match and Clear:   no testid confirmed, matched by text and role
 *
 * Sort state lives in the query string (`?sort=name&dir=asc|desc`).
 */

import type { TestContextOptions } from '@TestContext';

import { expect } from '@playwright/test';
import { UiBase } from '@ui/UiBase';
import { atc, step } from '@utils/decorators';

// ============================================
// Types
// ============================================

export interface ProjectTestsRow {
  testId: string
  title: string
  chainLength: number
  tags: string[]
  createdDay: string
}

export interface ProjectTestsScope {
  slug: string
  ownTitles: string[]
  foreignTitles: string[]
}

export interface TagFilterCountArgs {
  tag: string
  matchingTitles: string[]
  total: number
}

export interface TagScopeArgs {
  tag: string
  expectedTitles: string[]
  foreignTitles: string[]
}

export interface TestDetailArgs {
  slug: string
  testId: string
  title: string
  chainAtcTitle: string
}

// ============================================
// Project Tests Page Component
// ============================================

export class ProjectTestsPage extends UiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Navigation (Public)
  // ============================================

  /**
   * Navigate straight to a Project's Tests list. Call before any list ATC that
   * does not start from the Project overview. The active workspace must already
   * be selected (`ui.projects.selectWorkspace`).
   *
   * @param slug - slug of the Project whose Tests list to open
   */
  @step
  async open(slug: string): Promise<void> {
    await this.page.goto(this.buildUrl(`/projects/${slug}/tests`));
  }

  // ============================================
  // Helpers (Private)
  // ============================================

  private testsList() {
    return this.page.locator('[data-testid="tests-list"]');
  }

  private rows() {
    return this.page.locator('[data-testid^="tests-list-row-"]');
  }

  private row(testId: string) {
    return this.page.locator(`[data-testid="tests-list-row-${testId}"]`);
  }

  private tagFilter() {
    return this.page.locator('[data-testid="test-tag-filter"]');
  }

  private sortHeader(key: 'name' | 'chain' | 'created') {
    return this.page.locator(`[data-testid="tests-list-sort-${key}"]`);
  }

  /**
   * Wait until the route has settled on a single list container.
   *
   * BK-1618: right after a Project switch the DOM briefly holds two
   * `tests-list` containers (server markup and client markup coexist) for about
   * 150 ms before collapsing to one. Waiting on that specific condition keeps
   * every locator strict without hiding the defect, which is tracked separately.
   */
  private async waitForSingleList(): Promise<void> {
    await expect(this.testsList()).toHaveCount(1);
  }

  /**
   * Map each rendered row, in DOM order, to the known title it displays.
   * A row that matches none of `known` is returned as its raw text, so an
   * unexpected row fails the comparison instead of being dropped.
   */
  private async renderedTitles(known: string[]): Promise<string[]> {
    const texts = await this.rows().allTextContents();
    return texts.map(text => known.find(title => text.includes(title)) ?? text.trim());
  }

  // ============================================
  // ATCs - Complete Test Cases
  // ============================================

  /**
   * ATC: The Project's sub-nav carries a Tests entry; activating it opens the
   * Project's Tests list, and the entry is marked as the current section.
   *
   * @param slug - the Project slug whose overview hosts the sub-nav
   */
  @atc('BK-1560')
  async openFromSubNavMarksTestsCurrent(slug: string): Promise<void> {
    await this.page.goto(this.buildUrl(`/projects/${slug}`));

    const entry = this.page.locator('[data-testid="project-subnav-tests"]');
    await entry.click();
    await this.page.waitForURL(`**/projects/${slug}/tests`);
    await this.waitForSingleList();

    await expect(this.page).toHaveURL(new RegExp(`/projects/${slug}/tests$`));
    await expect(entry).toHaveAttribute('aria-current', 'page');
    await expect(this.testsList()).toBeVisible();
  }

  /**
   * ATC: The Tests list of a Project shows that Project's own Tests and never
   * a Test that belongs to another Project of the same Workspace.
   *
   * The list root is the assertion scope, so a title that appears elsewhere on
   * the page cannot make a foreign title look present.
   *
   * @param scope - the Project slug, its own Test titles, and another Project's Test titles
   */
  @atc('BK-1562')
  async listsOnlyCurrentProjectTests(scope: ProjectTestsScope): Promise<void> {
    await this.waitForSingleList();
    const list = this.testsList();
    await expect(this.page).toHaveURL(new RegExp(`/projects/${scope.slug}/tests$`));
    await expect(list).toBeVisible();

    for (const title of scope.ownTitles) {
      await expect(list).toContainText(title);
    }
    for (const title of scope.foreignTitles) {
      await expect(list).not.toContainText(title);
    }
  }

  /**
   * ATC: Every Tests row carries the Test's name, its chain length in words
   * ("N ATCs" or "1 ATC"), its tags (or an em dash when none), and the UTC day
   * it was created.
   *
   * @param rows - the expected rows (testId, title, chainLength, tags, createdDay)
   */
  @atc('BK-1566')
  async rowsShowNameChainCountTagsAndCreatedDay(rows: ProjectTestsRow[]): Promise<void> {
    await this.waitForSingleList();
    const list = this.testsList();
    for (const header of ['Name', 'Chain', 'Tags', 'Created']) {
      await expect(list.getByRole('columnheader', { name: header })).toBeVisible();
    }

    for (const expected of rows) {
      const row = this.row(expected.testId);
      await expect(row).toContainText(expected.title);

      const chain = expected.chainLength === 1 ? '1 ATC' : `${expected.chainLength} ATCs`;
      await expect(row).toContainText(chain);

      if (expected.tags.length === 0) {
        await expect(row).toContainText('\u2014');
      }
      else {
        for (const tag of expected.tags) {
          await expect(row).toContainText(tag);
        }
      }

      await expect(row).toContainText(expected.createdDay);
    }
  }

  /**
   * ATC: The shared tag filter narrows this list to the Tests that carry the
   * tag, and the count reads "N of M Tests carry <tag>" ("carries" when N = 1).
   *
   * @param args - the tag, the expected matching titles, and the Project total M
   */
  @atc('BK-1569')
  async tagFilterNarrowsListAndStatesCount(args: TagFilterCountArgs): Promise<void> {
    await this.waitForSingleList();
    await this.tagFilter().fill(args.tag);

    await expect(this.rows()).toHaveCount(args.matchingTitles.length);
    for (const title of args.matchingTitles) {
      await expect(this.testsList()).toContainText(title);
    }

    const n = args.matchingTitles.length;
    const verb = n === 1 ? 'carries' : 'carry';
    await expect(this.page.locator('[data-testid="tests-list-count"]'))
      .toHaveText(`${n} of ${args.total} Tests ${verb} ${args.tag}`);
  }

  /**
   * ATC: Typing a tag into the Project's Tests list narrows it to this
   * Project's matching Tests. A Test with that tag in another Project is never
   * listed, and no foreign title appears.
   *
   * @param args - the tag, the expected own titles and the foreign titles that must stay out
   */
  @atc('BK-1570')
  async tagFilterKeepsListProjectScoped(args: TagScopeArgs): Promise<void> {
    await this.waitForSingleList();
    await this.tagFilter().fill(args.tag);

    const list = this.testsList();
    await expect(this.rows()).toHaveCount(args.expectedTitles.length);
    for (const title of args.expectedTitles) {
      await expect(list).toContainText(title);
    }
    for (const title of args.foreignTitles) {
      await expect(list).not.toContainText(title);
    }
  }

  /**
   * ATC: A tag that matches no Test in this Project shows the copy
   * "No Test carries this tag" with a Clear action. The state is distinct from
   * "No Tests yet", and nothing on screen reads as an error.
   *
   * @param tag - a tag no Test in the Project carries
   */
  @atc('BK-1573')
  async showsNoMatchStateWithClear(tag: string): Promise<void> {
    await this.waitForSingleList();
    await this.tagFilter().fill(tag);

    const list = this.testsList();
    await expect(list.getByText('No Test carries this tag')).toBeVisible();
    await expect(list.getByRole('button', { name: /clear/i })).toBeVisible();

    await expect(this.page.locator('[data-testid="tests-list-table"]')).toHaveCount(0);
    await expect(list.getByText('No Tests yet')).toHaveCount(0);
    await expect(list.getByRole('alert')).toHaveCount(0);
  }

  /**
   * ATC: The Name column sorts the Tests list by name ascending on the first
   * click, and reverses the order on the second click. The sort lives in the URL.
   *
   * @param expectedAscending - the titles in ascending order (Name sort)
   */
  @atc('BK-1574')
  async sortsByNameAscendingThenReverses(expectedAscending: string[]): Promise<void> {
    await this.waitForSingleList();
    const header = this.sortHeader('name');

    await header.click();
    await expect(this.page).toHaveURL(/sort=name/);
    await expect(this.page).toHaveURL(/dir=asc/);
    await expect.poll(async () => this.renderedTitles(expectedAscending)).toEqual(expectedAscending);

    await header.click();
    await expect(this.page).toHaveURL(/dir=desc/);
    await expect.poll(async () => this.renderedTitles(expectedAscending))
      .toEqual([...expectedAscending].reverse());
  }

  /**
   * ATC: Opening a row goes to that Test's own detail route and shows the
   * Test's title and its chain ATC, as the explorer reaches it.
   *
   * @param args - the Project slug, the Test id and title, and the chain ATC title
   */
  @atc('BK-1578')
  async rowOpensTestDetailView(args: TestDetailArgs): Promise<void> {
    await this.waitForSingleList();
    await this.page.locator(`[data-testid="tests-list-open-${args.testId}"]`).click();
    await this.page.waitForURL(`**/projects/${args.slug}/tests/${args.testId}`);

    await expect(this.page).toHaveURL(new RegExp(`/projects/${args.slug}/tests/${args.testId}$`));
    await expect(this.page.getByText(args.title).first()).toBeVisible();
    await expect(this.page.getByText(args.chainAtcTitle).first()).toBeVisible();
  }
}
