/**
 * KATA Architecture - Layer 3: Home Page Component
 *
 * UI component for BK-258's Home "Open bugs" card (`/home`).
 *
 * Locators (data-testid, scoped to `home-open-bugs*` so the sibling Home
 * cards, e.g. BK-259 Coverage, never interfere):
 * - Card root:        [data-testid="home-open-bugs"]
 * - Total:            [data-testid="home-open-bugs-count"]
 * - Chips container:  [data-testid="home-open-bugs-severities"]
 * - Chip per level:   [data-testid="home-open-bugs-severity-P1"] .. P4
 *                     text pattern `P{n} {Critical|Major|Minor|Trivial} {count}`
 * - Loading:          [data-testid="home-open-bugs-skeleton"]
 * - Zero state:       [data-testid="home-open-bugs-empty"] (replaces the chips)
 */

import type { OpenBugsCounts } from '@data/types';
import type { TestContextOptions } from '@TestContext';

import { expect } from '@playwright/test';
import { UiBase } from '@ui/UiBase';
import { atc, step } from '@utils/decorators';

// ============================================
// Types
// ============================================

type Severity = 'P1' | 'P2' | 'P3' | 'P4';

const SEVERITY_LABELS: Record<Severity, string> = {
  P1: 'Critical',
  P2: 'Major',
  P3: 'Minor',
  P4: 'Trivial',
};

const SEVERITIES = Object.keys(SEVERITY_LABELS) as Severity[];

// ============================================
// Home Page Component
// ============================================

export class HomePage extends UiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Navigation (Public)
  // ============================================

  /**
   * Navigate to Home. Call before any Home-card ATC.
   */
  @step
  async open(): Promise<void> {
    await this.page.goto(this.buildUrl('/home'));
  }

  /**
   * Point the BROWSER at a workspace. The active workspace is the httpOnly
   * `bk_active_ws` cookie, set by this POST in the page's own cookie jar. It
   * goes through `page.request` on purpose: it sends the session cookie and no
   * bearer, and a PAT gets 403 on this endpoint (an Api-class helper would
   * attach the PAT unless the caller cleared it first). Only the per-test
   * browser context changes; the server-side active workspace of the user is
   * untouched.
   *
   * @param workspaceId - workspace the Home card must render
   */
  @step
  async selectWorkspace(workspaceId: string): Promise<void> {
    const url = `${this.config.apiUrl.replace(/\/$/, '')}/v1/me/active-workspace`;
    const response = await this.page.request.post(url, { data: { workspace_id: workspaceId } });
    expect(response.ok(), `selecting workspace ${workspaceId} failed with HTTP ${response.status()}`).toBe(true);
  }

  // ============================================
  // ATCs - Complete Test Cases
  // ============================================

  /**
   * ATC: The Home "Open bugs" card shows the expected total and the four
   * severity chips, and the total equals the sum of the chips. Starts on
   * /home (navigation is the separate `open()` helper).
   *
   * The loading placeholder is awaited away BEFORE any count is read: while
   * the Suspense skeleton is attached the count test id can resolve to two
   * elements.
   *
   * @param expected - total and per-severity counts the card must show
   */
  @atc('BK-1093')
  async showsOpenBugTotalWithSeverityBreakdown(expected: OpenBugsCounts): Promise<void> {
    await expect(this.page.locator('[data-testid="home-open-bugs-skeleton"]')).toHaveCount(0);
    await expect(this.page.locator('[data-testid="home-open-bugs-severities"]')).toBeVisible();

    await expect(this.page.locator('[data-testid="home-open-bugs-count"]')).toHaveText(String(expected.total));

    for (const severity of SEVERITIES) {
      const chip = this.page.locator(`[data-testid="home-open-bugs-severity-${severity}"]`);
      await expect(chip).toBeVisible();
      await expect(chip).toHaveText(new RegExp(`^${severity}\\s*${SEVERITY_LABELS[severity]}\\s*${expected[severity]}$`));
    }

    // The card matched every expected figure above, so this is the total/breakdown identity on what it renders.
    expect(expected.total).toBe(expected.P1 + expected.P2 + expected.P3 + expected.P4);
  }

  /**
   * ATC: The Home "Open bugs" card shows the expected total and the P3 (Minor)
   * chip. Starts on /home (navigation is the separate `open()` helper).
   *
   * Only meaningful while the workspace has at least one open bug: with zero
   * open bugs the card swaps the chips for the empty message, so the P3 chip
   * would not exist. The test asserts that precondition before calling this.
   *
   * @param expected - total and P3 count the card must show
   * @param expected.total - workspace open bug total shown by the card
   * @param expected.P3 - count shown on the P3 Minor chip
   */
  @atc('BK-1094')
  async showsCountedBugTotalAndMinorChip(expected: { total: number, P3: number }): Promise<void> {
    await this.waitForCardSettled();

    await expect(this.page.locator('[data-testid="home-open-bugs-count"]')).toHaveText(String(expected.total));

    const chip = this.page.locator('[data-testid="home-open-bugs-severity-P3"]');
    await expect(chip).toBeVisible();
    await expect(chip).toHaveText(new RegExp(`^P3\\s*${SEVERITY_LABELS.P3}\\s*${expected.P3}$`));
  }

  /**
   * ATC: The Home "Open bugs" card shows the zero state: total 0, the all-clear
   * message and no severity chips. Starts on /home (navigation is the separate
   * `open()` helper).
   *
   * Every locator is scoped to the "Open bugs" region: on CI the unscoped count
   * test id resolved to a second, identical element outside the card (strict
   * mode violation) even after the skeleton had detached.
   */
  @atc('BK-1096')
  async showsZeroStateWithoutSeverityChips(): Promise<void> {
    await this.waitForCardSettled();

    const card = this.page.getByRole('region', { name: 'Open bugs' });
    await expect(card.getByTestId('home-open-bugs-count')).toHaveText('0');
    await expect(card.getByTestId('home-open-bugs-empty')).toHaveText('Nothing outstanding right now.');
    await expect(card.getByTestId('home-open-bugs-severities')).toHaveCount(0);
  }

  /**
   * ATC: The Home "Open bugs" card shows the expected total and the P1/P2 chips
   * after the test archived the module that held the P1 bugs. Starts on /home
   * (navigation is the separate `open()` helper); the archive is orchestrated by
   * the test through `ProjectsApi.archiveModuleSuccessfully`.
   *
   * Fixed assertions:
   *  - skeleton placeholder gone (private waitForCardSettled) BEFORE any read
   *  - total text equals expected.total
   *  - P1 chip visible and its text matches /^P1\s*Critical\s*{expected.P1}$/
   *  - P2 chip visible and its text matches /^P2\s*Major\s*{expected.P2}$/
   * Scenario assertions: values from `expected` (computed by the test from the
   * API read taken before the archive: -2 total, -2 P1, P2 unchanged).
   *
   * Locators are scoped to the "Open bugs" region: BK-1096 found that on CI the
   * unscoped count test id resolved to a second element outside the card.
   */
  @atc('BK-1095')
  async showsOpenBugCountsExcludingArchivedModule(expected: { total: number, P1: number, P2: number }): Promise<void> {
    await this.waitForCardSettled();

    const card = this.page.getByRole('region', { name: 'Open bugs' });
    await expect(card.getByTestId('home-open-bugs-count')).toHaveText(String(expected.total));

    const p1Chip = card.getByTestId('home-open-bugs-severity-P1');
    await expect(p1Chip).toBeVisible();
    await expect(p1Chip).toHaveText(new RegExp(`^P1\\s*${SEVERITY_LABELS.P1}\\s*${expected.P1}$`));

    const p2Chip = card.getByTestId('home-open-bugs-severity-P2');
    await expect(p2Chip).toBeVisible();
    await expect(p2Chip).toHaveText(new RegExp(`^P2\\s*${SEVERITY_LABELS.P2}\\s*${expected.P2}$`));
  }

  /**
   * ATC: The Home "Open bugs" card shows exactly the active workspace's counts:
   * the total and all four severity chips. Starts on /home (navigation is the
   * separate `open()` helper; the workspace is chosen by `selectWorkspace()`).
   *
   * Fixed assertions:
   *  - skeleton placeholder gone (private waitForCardSettled) BEFORE any read
   *  - total text equals expected.total
   *  - each chip P1..P4 visible and its text matches /^{sev}\s*{label}\s*{expected[sev]}$/
   * Scenario assertions: values from `expected` (the active workspace's API
   * read). A zero chip is asserted too: that is how "no bug of the inactive
   * workspace" is proven for a severity only the inactive workspace holds.
   *
   * Locators are scoped to the "Open bugs" region (BK-1096 CI strict-mode finding).
   *
   * @param expected - total and per-severity counts of the active workspace
   */
  @atc('BK-1099')
  async showsOnlyActiveWorkspaceOpenBugs(expected: OpenBugsCounts): Promise<void> {
    await this.waitForCardSettled();

    const card = this.page.getByRole('region', { name: 'Open bugs' });
    await expect(card.getByTestId('home-open-bugs-count')).toHaveText(String(expected.total));

    for (const severity of SEVERITIES) {
      const chip = card.getByTestId(`home-open-bugs-severity-${severity}`);
      await expect(chip).toBeVisible();
      await expect(chip).toHaveText(new RegExp(`^${severity}\\s*${SEVERITY_LABELS[severity]}\\s*${expected[severity]}$`));
    }
  }

  // ============================================
  // Private helpers
  // ============================================

  /**
   * The loading placeholder is awaited away BEFORE any count is read: while the
   * Suspense skeleton is attached the count test id can resolve to two elements.
   */
  private async waitForCardSettled(): Promise<void> {
    await expect(this.page.locator('[data-testid="home-open-bugs-skeleton"]')).toHaveCount(0);
  }
}
