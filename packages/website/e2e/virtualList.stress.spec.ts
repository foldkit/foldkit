import { expect, test } from '@playwright/test'

test('keeps sustained upward history scrolling populated and continuous', async ({
  page,
}) => {
  await page.goto('/ui/virtual-list')
  await page.locator('[data-browser-environment-loaded]').waitFor()
  const container = page.getByRole('list', {
    name: 'End-anchored chat messages',
  })
  await container.locator('[data-virtual-list-item-key]').first().waitFor()
  await page.waitForTimeout(400)
  await expect(
    page.getByText('24 messages loaded', { exact: true }),
  ).toBeVisible()

  const result = await container.evaluate(async element => {
    element.addEventListener(
      'scrollend',
      event => event.stopImmediatePropagation(),
      { capture: true },
    )
    const nativeScrollTo = element.scrollTo
    let writes = 0
    Object.defineProperty(element, 'scrollTo', {
      configurable: true,
      value: (...args: Array<unknown>) => {
        writes += 1
        return Reflect.apply(nativeScrollTo, element, args)
      },
    })

    const samples = []
    for (let step = 0; step < 180; step += 1) {
      element.scrollTop -= 100
      element.dispatchEvent(new Event('scroll'))
      await new Promise<void>(resolve => setTimeout(resolve, 25))

      const rect = element.getBoundingClientRect()
      const rows = Array.from(
        element.querySelectorAll<HTMLElement>('[data-virtual-list-item-key]'),
      )
      const firstVisible = rows.find(row => {
        const rowRect = row.getBoundingClientRect()
        return rowRect.bottom > rect.top && rowRect.top < rect.bottom
      })
      samples.push({
        step,
        scrollTop: element.scrollTop,
        startPadding: Number(element.dataset['virtualListStartPadding']),
        firstVisible: firstVisible?.dataset['virtualListItemKey'],
        remaining:
          element.scrollHeight - element.clientHeight + element.scrollTop,
        mountedRows: rows.length,
        writes,
      })
    }
    return samples
  })

  const skips = result.filter((sample, index) => {
    const previous = result.at(index - 1)
    if (
      previous?.firstVisible === undefined ||
      sample.firstVisible === undefined
    ) {
      return sample.firstVisible === undefined
    }
    return Number(previous.firstVisible) - Number(sample.firstVisible) > 8
  })
  expect(result.at(-1)?.writes).toBe(0)
  expect(result.every(sample => sample.firstVisible !== undefined)).toBe(true)
  expect(result.every(sample => sample.remaining > 0)).toBe(true)
  expect(result.every(sample => sample.mountedRows < 80)).toBe(true)
  expect(skips).toHaveLength(0)
  expect(result.at(-1)?.scrollTop).toBeLessThan(-15_000)
})
