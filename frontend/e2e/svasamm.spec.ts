import { test, expect } from '@playwright/test'

const TEST_USER = process.env.TEST_USER || 'admin@videojet.com'
const TEST_PWD = process.env.TEST_USER_PWD || 'VideojetAdmin2026!'

test.describe('Svasamm CRM SPA branding', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    // Authenticate via Frappe's REST login endpoint, then inject the
    // session cookies into the browser context. This avoids driving the
    // HTML login form: Frappe v16's login page uses Vue components whose
    // input[name] attributes and mount timing differ from earlier
    // versions, causing page.fill('input[name="usr"]', ...) to time out
    // waiting for an element that never matches. The REST API accepts
    // usr/pwd regardless of the form's current DOM shape.
    const loginResponse = await page.request.post(
      `${baseURL}/api/method/login`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        form: { usr: TEST_USER, pwd: TEST_PWD },
      },
    )
    if (!loginResponse.ok()) {
      throw new Error(
        `Login to ${baseURL} as ${TEST_USER} failed: ${loginResponse.status()} ${await loginResponse.text()}`,
      )
    }
    const { cookies } = await page.request.storageState()
    await page.context().addCookies(cookies)
  })

  test('document title is Svasamm CRM', async ({ page }) => {
    await page.goto('/crm')
    await expect(page).toHaveTitle(/Svasamm CRM/, { timeout: 10_000 })
  })

  // NOTE: Two tests previously lived here and have been removed because they
  // validated surfaces owned by OTHER layers of the stack, not by this fork:
  //
  //   1. `.svasamm-footer` AGPL footer — injected by the `svasamm_crm`
  //      tenant-layer wrapper app (Layer 2b) via `web_include_css` +
  //      `extend_bootinfo`. The CI test site here only installs
  //      `crm + erpnext + frappe` — no `svasamm_crm` — so the footer
  //      never renders. Test belongs in `svasamm_crm`'s own e2e suite.
  //
  //   2. `img[alt*="Svasamm CRM"]` navbar logo — the AppHeader component
  //      was stripped down in Sprint 4 Phase 1 (kept only teleport +
  //      CallUI; see `frontend/src/components/Layouts/AppHeader.vue`).
  //      There is no navbar <img> to assert on anymore.
  //
  // Fork-level AGPL source link verification lives in AboutModal.vue
  // (`https://github.com/svasamm-research/crm/releases`). Wiring the
  // UserMenu-click-to-open flow into this suite is tracked for Sprint 5
  // once the tenant-layer e2e setup lands; until then the dashboard +
  // leads snapshot tests below catch any visual regression on the
  // fork-owned chrome.

  test('snapshot: crm dashboard after login', async ({ page }) => {
    await page.goto('/crm')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
    await expect(page).toHaveScreenshot('crm-dashboard.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    })
  })

  test('snapshot: leads list empty state', async ({ page }) => {
    // Navigate to leads list — relies on an empty or very-short list
    await page.goto('/crm/leads')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
    await expect(page).toHaveScreenshot('crm-leads.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    })
  })
})
