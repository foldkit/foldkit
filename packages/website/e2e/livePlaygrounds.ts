import { expect, test } from '@playwright/test'
import type { FrameLocator, Page } from '@playwright/test'

const PLAYGROUND_BOOT_TIMEOUT_MILLISECONDS = 240_000

const capturePlaygroundFrame = (page: Page) =>
  page.addInitScript(() => {
    const findNode = () =>
      document.querySelector('iframe[title="Foldkit Playground"]')
    const existingNode = findNode()
    if (existingNode !== null) {
      Reflect.set(window, '__foldkitPlaygroundFrame', existingNode)
      return
    }
    const observer = new MutationObserver(() => {
      const node = findNode()
      if (node !== null) {
        Reflect.set(window, '__foldkitPlaygroundFrame', node)
        observer.disconnect()
      }
    })
    observer.observe(document, { childList: true, subtree: true })
  })

const assertPlaygroundFrameRemains = async (page: Page) => {
  const iframeIdentity = await page.evaluate(() => {
    const capturedFrame = Reflect.get(window, '__foldkitPlaygroundFrame')
    const current = document.querySelector('iframe[title="Foldkit Playground"]')
    if (!(capturedFrame instanceof HTMLIFrameElement)) {
      return 'not captured'
    }
    if (!capturedFrame.isConnected) {
      return 'detached'
    }
    return capturedFrame === current ? 'preserved' : 'different'
  })
  expect(iframeIdentity).toBe('preserved')
}

const playgroundFrame = async (page: Page, slug: string) => {
  await capturePlaygroundFrame(page)
  await page.goto(`/playground/${slug}`, { waitUntil: 'domcontentloaded' })
  const frameElement = page.locator('iframe[title="Foldkit Playground"]')
  await expect(frameElement).toBeAttached({
    timeout: PLAYGROUND_BOOT_TIMEOUT_MILLISECONDS,
  })

  const frame = page.frameLocator('iframe[title="Foldkit Playground"]')
  await expect(frameElement).toBeVisible({
    timeout: PLAYGROUND_BOOT_TIMEOUT_MILLISECONDS,
  })
  await expect(frameElement).toHaveAttribute('aria-hidden', 'false')
  await expect(frameElement).not.toHaveAttribute('inert')
  const isInert = await frameElement.evaluate(element => {
    if (!(element instanceof HTMLIFrameElement)) {
      throw new Error('The playground preview is not an iframe')
    } else {
      return element.inert
    }
  })
  expect(isInert).toBe(false)
  await expect(frameElement).toHaveAttribute('tabindex', '0')
  expect(await frame.locator('[data-foldkit-build]').count()).toBe(0)
  await assertPlaygroundFrameRemains(page)
  return frame
}

const waitForHydration = (frame: FrameLocator) =>
  expect(frame.locator('[data-foldkit-build]')).toHaveCount(0, {
    timeout: PLAYGROUND_BOOT_TIMEOUT_MILLISECONDS,
  })

test.describe.configure({ mode: 'serial' })

test('deployed SSR playground installs, boots, and hydrates', async ({
  page,
}) => {
  const frame = await playgroundFrame(page, 'ssr')
  await expect(
    frame.getByRole('heading', { name: 'Server-rendered counter' }),
  ).toBeVisible({ timeout: PLAYGROUND_BOOT_TIMEOUT_MILLISECONDS })
  await waitForHydration(frame)

  const count = frame.locator('#count')
  const initialCount = Number(await count.textContent())
  expect(Number.isFinite(initialCount)).toBe(true)
  await frame.getByRole('button', { name: '+', exact: true }).click()
  await expect(count).toHaveText(String(initialCount + 1))
})

test('deployed SSG playground installs, boots, and hydrates', async ({
  page,
}) => {
  const frame = await playgroundFrame(page, 'ssg')
  await expect(
    frame.getByRole('heading', { name: 'Statically generated home' }),
  ).toBeVisible({ timeout: PLAYGROUND_BOOT_TIMEOUT_MILLISECONDS })
  await waitForHydration(frame)

  const count = frame.getByRole('button', { name: 'Count: 0' })
  await count.click()
  await expect(frame.getByRole('button', { name: 'Count: 1' })).toBeVisible()
})
