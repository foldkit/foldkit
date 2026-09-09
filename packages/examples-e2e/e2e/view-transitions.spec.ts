import {
  type Locator,
  type Page as PlaywrightPage,
  expect,
  test,
} from '@playwright/test'

import * as Page from '../page'

const DEVTOOLS_HOST_ID = 'foldkit-devtools'
const BLOCKER_CLASS = 'dt-interaction-blocker'

type Point = Readonly<{ x: number; y: number }>

type HitTest = Readonly<{
  topElement: string | null
  shadowElementClass: string | null
  blockerPointerEvents: string | null
}>

const centerOf = async (locator: Locator): Promise<Point> => {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error('Expected the target element to have a bounding box')
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const hitTestAt = (page: PlaywrightPage, point: Point): Promise<HitTest> =>
  page.evaluate(
    ({ x, y, hostId, blockerClass }) => {
      const host = document.getElementById(hostId)
      const shadowRoot = host?.shadowRoot ?? null
      const blocker = shadowRoot?.querySelector(`.${blockerClass}`) ?? null
      const topElement = document.elementFromPoint(x, y)
      const shadowElement = shadowRoot?.elementFromPoint(x, y) ?? null
      const elementLabel = (element: Element): string =>
        `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`

      return {
        topElement: topElement ? elementLabel(topElement) : null,
        shadowElementClass: shadowElement
          ? shadowElement.getAttribute('class')
          : null,
        blockerPointerEvents: blocker
          ? getComputedStyle(blocker).pointerEvents
          : null,
      }
    },
    {
      x: point.x,
      y: point.y,
      hostId: DEVTOOLS_HOST_ID,
      blockerClass: BLOCKER_CLASS,
    },
  )

test.describe('view-transitions example', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('navigates from a gallery card to the artwork detail and back', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Dawn Chorus' }).click()
    await expect(page).toHaveURL(/\/artwork\/1$/)
    await expect(page.getByText('A warm wash of first light')).toBeVisible()
    await page.getByRole('link', { name: 'Back to gallery' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Deep Water' })).toBeVisible()
  })

  test('filtering narrows the gallery without navigating', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('Filter by title').fill('graphite')
    await expect(page.getByRole('link', { name: 'Graphite' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Dawn Chorus' })).toBeHidden()
    await expect(page).toHaveURL(/\/$/)
  })

  test('route changes run inside startViewTransition and keystrokes do not', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const originalStartViewTransition =
        document.startViewTransition.bind(document)
      document.startViewTransition = callbackOptions => {
        const currentCount = Number(
          document.documentElement.dataset['viewTransitionCount'] ?? '0',
        )
        document.documentElement.dataset['viewTransitionCount'] = String(
          currentCount + 1,
        )
        return originalStartViewTransition(callbackOptions)
      }
    })

    const transitionCount = (): Promise<number> =>
      page.evaluate(() =>
        Number(document.documentElement.dataset['viewTransitionCount'] ?? '0'),
      )

    await page.goto('/')
    expect(await transitionCount()).toBe(0)

    await page.getByRole('link', { name: 'Deep Water' }).click()
    await expect(page).toHaveURL(/\/artwork\/2$/)
    await expect.poll(transitionCount).toBe(1)

    await page.getByRole('link', { name: 'Back to gallery' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect.poll(transitionCount).toBe(2)

    await page.getByPlaceholder('Filter by title').fill('moss')
    await expect(page.getByRole('link', { name: 'Moss Study' })).toBeVisible()
    expect(await transitionCount()).toBe(2)
  })

  test('DevTools time travel blocks application clicks until resumed', async ({
    page,
  }) => {
    await page.goto('/')

    const badge = page.locator('.dt-badge')
    const blocker = page.locator(`.${BLOCKER_CLASS}`)
    await expect(badge).toBeVisible()
    await expect(blocker).toHaveCount(0)

    await badge.click()
    await expect(page.locator('.dt-panel')).toBeVisible()

    const filterInput = page.getByPlaceholder('Filter by title')
    await filterInput.fill('gradient')
    await filterInput.fill('dawn')

    const historyRows = page.locator('.dt-row')
    await expect(historyRows).toHaveCount(3)

    await historyRows.filter({ hasText: 'UpdatedFilterText' }).last().click()
    await expect(page.locator('.dt-resume-button')).toBeVisible()
    await expect(blocker).toHaveCount(1)

    const artworkPoint = await centerOf(
      page.getByRole('link', { name: 'Dawn Chorus' }),
    )

    const hitTest = await hitTestAt(page, artworkPoint)
    expect(hitTest.topElement).toBe(`div#${DEVTOOLS_HOST_ID}`)
    expect(hitTest.shadowElementClass).toContain(BLOCKER_CLASS)
    expect(hitTest.blockerPointerEvents).toBe('auto')

    await page.mouse.click(artworkPoint.x, artworkPoint.y)
    await expect(page).toHaveURL(/\/$/)
    await expect(historyRows).toHaveCount(3)

    await page.locator('.dt-resume-button').click()
    await expect(blocker).toHaveCount(0)
    await expect(page).toHaveURL(/\/$/)
    await expect(historyRows).toHaveCount(3)

    await page.mouse.click(artworkPoint.x, artworkPoint.y)
    await expect(page).toHaveURL(/\/artwork\/1$/)
    await expect(page.getByText('A warm wash of first light')).toBeVisible()
  })
})
