/**
 * KATA Architecture - Layer 4: API Fixture
 *
 * Dependency Injection container for all API components.
 * Provides unified access to API testing capabilities.
 *
 * All API components share the same request context from TestContext,
 * ensuring consistent authentication and request configuration.
 *
 * HOW TO ADD NEW API COMPONENTS:
 * 1. Create your component in tests/components/api/YourApi.ts
 * 2. Import it here
 * 3. Add as readonly property
 * 4. Initialize in constructor passing the options
 */

import type { TestContextOptions } from '@TestContext';

import { ApiBase } from '@api/ApiBase';
import { AtcsApi } from '@api/AtcsApi';
import { AuthApi } from '@api/AuthApi';
import { BugsApi } from '@api/BugsApi';
import { OpenBugsApi } from '@api/OpenBugsApi';
import { ProjectsApi } from '@api/ProjectsApi';
import { RunsApi } from '@api/RunsApi';
import { TraceabilityApi } from '@api/TraceabilityApi';
import { UserStoryApi } from '@api/UserStoryApi';

// ============================================
// API Fixture Class
// ============================================

export class ApiFixture extends ApiBase {
  /** Auth component - handles login and token management */
  readonly auth: AuthApi;

  /** User Story component - read User Stories */
  readonly userStory: UserStoryApi;

  /** Traceability component - BK-45 evidence chain read */
  readonly traceability: TraceabilityApi;

  /** Projects component - BK-266 setup helper (seed projects) */
  readonly projects: ProjectsApi;

  /** Open bugs component - BK-258 workspace open-bugs read (BK-1100, BK-1101) */
  readonly openBugs: OpenBugsApi;

  /** Bugs component - BK-258 setup helpers (file a bug, advance its status) */
  readonly bugs: BugsApi;

  /** Runs component - BK-45 setup helpers (start a Run, abort it) */
  readonly runs: RunsApi;

  /** ATCs component - BK-595 single-ATC read (BK-1368, BK-1374, BK-1377, BK-1378, BK-1379) */
  readonly atcs: AtcsApi;

  constructor(options: TestContextOptions) {
    super(options);

    // All components receive the same options (same request context)
    this.auth = new AuthApi(options);
    this.userStory = new UserStoryApi(options);
    this.traceability = new TraceabilityApi(options);
    this.projects = new ProjectsApi(options);
    this.openBugs = new OpenBugsApi(options);
    this.bugs = new BugsApi(options);
    this.runs = new RunsApi(options);
    this.atcs = new AtcsApi(options);
  }

  // ============================================
  // Token Propagation to Child Components
  // ============================================

  /**
   * Set authentication token for all API components.
   * This ensures all components use the same token for authenticated requests.
   */
  override setAuthToken(token: string) {
    super.setAuthToken(token);
    this.auth.setAuthToken(token);
    this.userStory.setAuthToken(token);
    this.traceability.setAuthToken(token);
    this.projects.setAuthToken(token);
    this.openBugs.setAuthToken(token);
    this.bugs.setAuthToken(token);
    this.runs.setAuthToken(token);
    this.atcs.setAuthToken(token);
  }

  /**
   * Clear authentication token from all API components.
   */
  override clearAuthToken() {
    super.clearAuthToken();
    this.auth.clearAuthToken();
    this.userStory.clearAuthToken();
    this.traceability.clearAuthToken();
    this.projects.clearAuthToken();
    this.openBugs.clearAuthToken();
    this.bugs.clearAuthToken();
    this.runs.clearAuthToken();
    this.atcs.clearAuthToken();
  }
}
