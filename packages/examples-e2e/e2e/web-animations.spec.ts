import { type Page, expect, test } from '@playwright/test'

const animations = (page: Page) =>
  page.evaluate(() => {
    const captured: ReadonlyArray<Animation> = Reflect.get(
      window,
      '__panelAnimations',
    )
    return captured.map(animation => ({
      state: animation.playState,
      time: animation.currentTime,
      isConnected:
        animation.effect instanceof KeyframeEffect &&
        animation.effect.target?.isConnected,
    }))
  })

const completionRows = (page: Page) =>
  page.locator('.dt-row').filter({ hasText: 'CompletedAnimatePanel' })

const openExample = async (
  page: Page,
  failure: 'creation' | 'playback' | undefined = undefined,
) => {
  const errors: Array<string> = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(failureMode => {
    const captured: Array<Animation> = []
    const rejections: Array<string> = []
    Object.assign(window, {
      __panelAnimations: captured,
      __panelRejections: rejections,
    })
    window.addEventListener('unhandledrejection', event =>
      rejections.push(String(event.reason)),
    )
    const animate = Element.prototype.animate
    Element.prototype.animate = function (keyframes, options) {
      if (this.getAttribute('aria-label') === 'Animated panel') {
        if (failureMode === 'creation') {
          throw new Error('Native animation unavailable')
        }
        const animation = animate.call(this, keyframes, options)
        if (failureMode === 'playback') {
          animation.play = () => {
            throw new Error('Native playback failed')
          }
        }
        captured.push(animation)
        return animation
      }
      return animate.call(this, keyframes, options)
    }
  }, failure)
  await page.goto('/')
  await expect(page.getByRole('status')).toHaveText('Hidden')
  await page.locator('.dt-badge').click()
  return async () => {
    expect(errors).toEqual([])
    expect(
      await page.evaluate(() => Reflect.get(window, '__panelRejections')),
    ).toEqual([])
  }
}

const showPanel = async (page: Page) => {
  await page.getByRole('button', { name: 'Show panel', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Running')
}

test('V2: native keyframes complete once', async ({ page }) => {
  const assertClean = await openExample(page)
  await showPanel(page)
  const nativeOptions = await page.evaluate(() => {
    const captured: ReadonlyArray<Animation> = Reflect.get(
      window,
      '__panelAnimations',
    )
    const animation = captured.at(0)
    if (!(animation?.effect instanceof KeyframeEffect)) {
      throw new Error('Missing panel animation')
    }
    return {
      frames: animation.effect.getKeyframes(),
      timing: animation.effect.getTiming(),
    }
  })
  expect(nativeOptions.frames).toMatchObject([
    { opacity: '0', transform: 'translateY(16px)', offset: 0 },
    { opacity: '1', transform: 'translateY(0px)', offset: 1 },
  ])
  expect(nativeOptions.timing).toMatchObject({
    duration: 1000,
    easing: 'ease-out',
    fill: 'auto',
  })
  await expect(page.getByRole('status')).toHaveText('Completed')
  await expect(completionRows(page)).toHaveCount(1)
  expect(await animations(page)).toMatchObject([
    { state: 'finished', isConnected: true },
  ])
  await assertClean()
})

test('V3: removing a running panel cancels the retained animation', async ({
  page,
}) => {
  const assertClean = await openExample(page)
  await showPanel(page)
  await page.getByRole('button', { name: 'Hide panel', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Hidden')
  await expect
    .poll(() => animations(page))
    .toMatchObject([{ state: 'idle', isConnected: false }])
  await expect(completionRows(page)).toHaveCount(0)
  await expect(
    page.locator('.dt-row').filter({ hasText: 'FailedAnimatePanel' }),
  ).toHaveCount(0)
  await assertClean()
})

test('V4: a replacement panel owns a distinct acquisition', async ({
  page,
}) => {
  const assertClean = await openExample(page)
  await showPanel(page)
  await page.getByRole('button', { name: 'Hide panel', exact: true }).click()
  await showPanel(page)
  await expect
    .poll(() => animations(page))
    .toMatchObject([
      { state: 'idle', isConnected: false },
      { state: 'running', isConnected: true },
    ])
  expect(
    await page.evaluate(() => {
      const captured: ReadonlyArray<Animation> = Reflect.get(
        window,
        '__panelAnimations',
      )
      const oldAnimation = captured.at(0)
      const newAnimation = captured.at(1)
      return (
        oldAnimation !== newAnimation &&
        oldAnimation?.effect !== newAnimation?.effect
      )
    }),
  ).toBe(true)
  await expect(completionRows(page)).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('Completed')
  await expect(completionRows(page)).toHaveCount(1)
  await assertClean()
})

test('V5: an unrelated rerender preserves the completed acquisition', async ({
  page,
}) => {
  const assertClean = await openExample(page)
  await showPanel(page)
  await expect(page.getByRole('status')).toHaveText('Completed')
  const panel = await page
    .getByRole('region', { name: 'Animated panel' })
    .elementHandle()
  await page.getByRole('button', { name: 'Increment counter' }).click()
  await expect(page.getByText('Counter: 1', { exact: true })).toBeVisible()
  expect(await panel?.evaluate(element => element.isConnected)).toBe(true)
  expect(await animations(page)).toMatchObject([
    { state: 'finished', isConnected: true },
  ])
  await expect(completionRows(page)).toHaveCount(1)
  await assertClean()
})

test('V6: historical inspection pauses and resumes a surviving acquisition without restarting completion', async ({
  page,
}) => {
  const assertClean = await openExample(page)
  await showPanel(page)
  await page.locator('.dt-row').filter({ hasText: 'ClickedShowPanel' }).click()
  await expect
    .poll(() => animations(page))
    .toMatchObject([{ state: 'paused', isConnected: true }])
  await page.evaluate(async () => {
    const captured: ReadonlyArray<Animation> = Reflect.get(
      window,
      '__panelAnimations',
    )
    await Promise.all(captured.map(animation => animation.ready))
  })
  const paused = await animations(page)
  await page.evaluate(
    () =>
      new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  )
  expect(await animations(page)).toEqual(paused)
  await expect(completionRows(page)).toHaveCount(0)
  await page.locator('.dt-resume-button').click()
  await expect
    .poll(() => animations(page))
    .toMatchObject([{ state: 'running', isConnected: true }])
  await expect(page.getByRole('status')).toHaveText('Completed')
  await page.locator('.dt-row').filter({ hasText: 'ClickedShowPanel' }).click()
  await page.locator('.dt-resume-button').click()
  expect(await animations(page)).toMatchObject([
    { state: 'finished', isConnected: true },
  ])
  await expect(completionRows(page)).toHaveCount(1)
  await assertClean()
})

test('V6: a historical acquisition cannot emit into live history', async ({
  page,
}) => {
  const assertClean = await openExample(page)
  await showPanel(page)
  await page.getByRole('button', { name: 'Hide panel', exact: true }).click()
  await page.locator('.dt-row').filter({ hasText: 'ClickedShowPanel' }).click()
  await expect
    .poll(() => animations(page))
    .toMatchObject([
      { state: 'idle', isConnected: false },
      { state: 'paused', isConnected: true },
    ])
  await page.evaluate(async () => {
    const captured: ReadonlyArray<Animation> = Reflect.get(
      window,
      '__panelAnimations',
    )
    const historicalAnimation = captured.at(1)
    if (!historicalAnimation) {
      throw new Error('Missing historical animation')
    }
    historicalAnimation.finish()
    await historicalAnimation.finished
  })
  await expect(completionRows(page)).toHaveCount(0)
  await page.locator('.dt-resume-button').click()
  await expect(page.getByRole('status')).toHaveText('Hidden')
  await expect
    .poll(() => animations(page))
    .toMatchObject([
      { state: 'idle', isConnected: false },
      { state: 'idle', isConnected: false },
    ])
  await expect(completionRows(page)).toHaveCount(0)
  await assertClean()
})

test('V7: creation failure becomes a Message and leaves the app responsive', async ({
  page,
}) => {
  const assertClean = await openExample(page, 'creation')
  await page.getByRole('button', { name: 'Show panel', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Failed: Native animation unavailable',
  )
  await expect(
    page.locator('.dt-row').filter({ hasText: 'FailedAnimatePanel' }),
  ).toHaveCount(1)
  expect(await animations(page)).toEqual([])
  await page.getByRole('button', { name: 'Increment counter' }).click()
  await expect(page.getByText('Counter: 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Hide panel', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Hidden')
  await assertClean()
})

test('V7: mounted playback failure becomes one Message without an unhandled rejection', async ({
  page,
}) => {
  const assertClean = await openExample(page, 'playback')
  await page.getByRole('button', { name: 'Show panel', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Failed: Native playback failed',
  )
  await expect(
    page.locator('.dt-row').filter({ hasText: 'FailedAnimatePanel' }),
  ).toHaveCount(1)
  await expect(completionRows(page)).toHaveCount(0)
  expect(await animations(page)).toMatchObject([
    { state: 'paused', isConnected: true },
  ])
  await page.getByRole('button', { name: 'Hide panel', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Hidden')
  await expect
    .poll(() => animations(page))
    .toMatchObject([{ state: 'idle', isConnected: false }])
  await assertClean()
})
