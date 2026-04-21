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

  test('AGPL footer is present with source link', async ({ page }) => {
    await page.goto('/crm')
    const footer = page.locator('.svasamm-footer')
    await expect(footer).toBeVisible({ timeout: 10_000 })
    const link = footer.locator('a')
    await expect(link).toHaveText(/source available/)
    await expect(link).toHaveAttribute(
      'href',
      /github\.com\/svasamm-research\/crm/,
    )
  })

  test('navbar shows Svasamm logo', async ({ page }) => {
    await page.goto('/crm')
    await page.waitForSelector('header, nav', { timeout: 10_000 })
    const logo = page.locator('img[alt*="Svasamm CRM" i]').first()
    await expect(logo).toBeVisible({ timeout: 10_000 })
  })

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
