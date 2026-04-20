import { test, expect } from '@playwright/test'

const TEST_USER = process.env.TEST_USER || 'admin@videojet.com'
const TEST_PWD = process.env.TEST_USER_PWD || 'VideojetAdmin2026!'

test.describe('Svasamm CRM SPA branding', () => {
  test.beforeEach(async ({ page }) => {
    // Unauthenticated /crm hits Desk login. Authenticate there, then return.
    await page.goto('/login')
    await page.fill('input[name="usr"]', TEST_USER)
    await page.fill('input[name="pwd"]', TEST_PWD)
    await page.click('button[type="submit"]')
    // Wait for Desk to land — /app is the Desk home post-login
    await page.waitForURL(/\/app|\/crm/, { timeout: 10_000 })
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
