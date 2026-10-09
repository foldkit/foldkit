import AxeBuilder from '@axe-core/playwright'
import { type Page, expect, test } from '@playwright/test'

const RUNTIME_LOAD_TIMEOUT_MILLISECONDS = 15_000

const waitForRuntime = async (page: Page) => {
  await expect(page.locator('[data-browser-environment-loaded]')).toHaveCount(
    1,
    {
      timeout: RUNTIME_LOAD_TIMEOUT_MILLISECONDS,
    },
  )
}

const suppressSlowWarnings = (page: Page) =>
  page.addInitScript(() => {
    const warn = console.warn
    console.warn = (...args) => {
      if (globalThis.String(args.at(0)).startsWith('[foldkit] Slow')) {
        return
      }

      warn(...args)
    }
  })

test('navigates nested actions with the keyboard and selects a leaf', async ({
  page,
}) => {
  await page.goto('/ui/menu')
  await waitForRuntime(page)

  const trigger = page.locator('#menu-submenu-demo-button')
  const rootMenu = page.locator('#menu-submenu-demo-items')

  await trigger.focus()
  await trigger.press('ArrowDown')
  await expect(rootMenu).toBeFocused()
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toHaveAttribute(
    'data-active',
    '',
  )

  await page.keyboard.press('ArrowDown')
  await expect(
    page.getByRole('menuitem', { name: 'Duplicate' }),
  ).toHaveAttribute('data-active', '')
  await page.keyboard.press('ArrowDown')
  await expect(
    page.getByRole('menuitem', { name: 'Organize' }),
  ).toHaveAttribute('data-active', '')

  await page.keyboard.press('ArrowRight')
  const inbox = page.getByRole('menuitem', { name: 'Inbox' })
  await expect(inbox).toBeVisible()
  await expect(inbox).toHaveAttribute('data-active', '')
  const inboxId = await inbox.getAttribute('id')
  expect(inboxId).not.toBeNull()
  await expect(rootMenu).toHaveAttribute('aria-activedescendant', inboxId ?? '')
  await expect(
    page.getByRole('menuitem', { name: 'Organize' }),
  ).not.toHaveAttribute('aria-expanded')

  await page.keyboard.press('ArrowLeft')
  await expect(inbox).toHaveCount(0)
  await expect(
    page.getByRole('menuitem', { name: 'Organize' }),
  ).toHaveAttribute('data-active', '')
  await page.keyboard.press('ArrowRight')
  await expect(inbox).toHaveAttribute('data-active', '')

  await page.keyboard.press('s')
  await expect(page.getByRole('menuitem', { name: 'Share' })).toHaveAttribute(
    'data-active',
    '',
  )
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('menuitem', { name: 'Email' })).toBeVisible()
  await expect(
    page.getByRole('menuitem', { name: 'Share' }),
  ).not.toHaveAttribute('aria-expanded')
  await expect(
    page.getByRole('menuitem', { name: 'Organize' }),
  ).not.toHaveAttribute('aria-expanded')
  await expect(rootMenu).toHaveAttribute(
    'aria-activedescendant',
    'menu-submenu-demo-submenu-2-2-item-0',
  )
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menuitem', { name: 'Email' })).toHaveCount(0)
  await expect(rootMenu).toBeFocused()
  await expect(page.getByRole('menuitem', { name: 'Share' })).toHaveAttribute(
    'data-active',
    '',
  )
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('menuitem', { name: 'Email' })).toHaveAttribute(
    'data-active',
    '',
  )
  await page.keyboard.press('Enter')

  await expect(
    page.getByText('Selected: Organize / Share / Email'),
  ).toBeVisible()
  await expect(rootMenu).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('opens a submenu on touch activation without hover', async ({ page }) => {
  await suppressSlowWarnings(page)
  await page.goto('/ui/menu')
  await waitForRuntime(page)

  await page.locator('#menu-submenu-demo-button').click()
  const organize = page.getByRole('menuitem', { name: 'Organize' })
  const childMenu = page.locator('#menu-submenu-demo-submenu-2')

  await organize.dispatchEvent('pointermove', {
    pointerType: 'touch',
    screenX: 20,
    screenY: 20,
  })
  await page.waitForTimeout(250)
  await expect(childMenu).toHaveCount(0)

  await organize.click()
  await expect(childMenu).toBeVisible()
  await expect(organize).not.toHaveAttribute('aria-expanded')
  await expect(organize).toHaveAttribute('data-open', '')

  await organize.dispatchEvent('click')
  await expect(organize).toHaveAttribute('aria-expanded', 'false')
  await expect(childMenu).toHaveCount(0)
  await expect(page.locator('#menu-submenu-demo-items')).toBeVisible()
})

test('keeps a submenu open while the pointer crosses a parent leaf', async ({
  page,
}) => {
  await suppressSlowWarnings(page)
  await page.goto('/ui/menu')
  await waitForRuntime(page)

  await page.locator('#menu-submenu-demo-button').click()
  const organize = page.getByRole('menuitem', { name: 'Organize' })
  const childMenu = page.locator('#menu-submenu-demo-submenu-2')
  await organize.hover()
  await expect(childMenu).toBeVisible()

  const triggerBox = await organize.boundingBox()
  const parentLeafBox = await page
    .getByRole('menuitem', { name: 'Duplicate' })
    .boundingBox()
  const targetBox = await page
    .getByRole('menuitem', { name: 'Inbox' })
    .boundingBox()
  expect(triggerBox).not.toBeNull()
  expect(parentLeafBox).not.toBeNull()
  expect(targetBox).not.toBeNull()
  if (triggerBox === null || parentLeafBox === null || targetBox === null) {
    return
  }

  await page.mouse.move(triggerBox.x + 12, triggerBox.y + triggerBox.height / 2)
  await page.mouse.move(
    parentLeafBox.x + 12,
    parentLeafBox.y + parentLeafBox.height / 2,
    { steps: 2 },
  )
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 12 },
  )
  await page.waitForTimeout(350)
  await expect(childMenu).toBeVisible()
})

test('does not open a disabled submenu', async ({ page }) => {
  await page.goto('/ui/menu')
  await waitForRuntime(page)

  await page.locator('#menu-submenu-demo-button').click()
  const exportItem = page.getByRole('menuitem', { name: 'Export' })
  await expect(exportItem).toHaveAttribute('aria-disabled', 'true')
  await exportItem.click({ force: true })
  await expect(page.locator('#menu-submenu-demo-submenu-4')).toHaveCount(0)

  const rootMenu = page.locator('#menu-submenu-demo-items')
  await rootMenu.focus()
  await page.keyboard.press('End')
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toHaveAttribute(
    'data-active',
    '',
  )
  await page.keyboard.press('ArrowUp')
  await expect(exportItem).toHaveAttribute('data-active', '')
  await expect(rootMenu).toHaveAttribute(
    'aria-activedescendant',
    'menu-submenu-demo-items-item-4',
  )
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#menu-submenu-demo-submenu-4')).toHaveCount(0)
  await expect(rootMenu).toBeVisible()
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('menuitem', { name: 'Move' })).toHaveAttribute(
    'data-active',
    '',
  )
})

test('switches between sibling submenus on pointer hover', async ({ page }) => {
  await page.goto('/ui/menu')
  await waitForRuntime(page)

  await page.locator('#menu-submenu-demo-button').click()
  await page.getByRole('menuitem', { name: 'Organize' }).hover()
  await expect(page.locator('#menu-submenu-demo-submenu-2')).toBeVisible()
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      const isOrganizeMounted =
        document.getElementById('menu-submenu-demo-submenu-2') !== null
      const isMoveMounted =
        document.getElementById('menu-submenu-demo-submenu-3') !== null
      if (!isOrganizeMounted && !isMoveMounted) {
        document.body.setAttribute('data-submenu-gap-observed', '')
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  })

  await page.getByRole('menuitem', { name: 'Move' }).hover()
  await expect(page.locator('#menu-submenu-demo-submenu-3')).toBeVisible()
  await expect(page.locator('#menu-submenu-demo-submenu-2')).toHaveCount(0)
  await expect(page.locator('body')).not.toHaveAttribute(
    'data-submenu-gap-observed',
  )
})

test('abandons a delayed submenu open after moving onto a leaf', async ({
  page,
}) => {
  await page.goto('/ui/menu')
  await waitForRuntime(page)

  await page.locator('#menu-submenu-demo-button').click()
  const organizeBox = await page
    .getByRole('menuitem', { name: 'Organize' })
    .boundingBox()
  const renameBox = await page
    .getByRole('menuitem', { name: 'Rename' })
    .boundingBox()
  expect(organizeBox).not.toBeNull()
  expect(renameBox).not.toBeNull()
  if (organizeBox === null || renameBox === null) {
    return
  }

  await page.mouse.move(organizeBox.x + 12, organizeBox.y + 12)
  await page.mouse.move(renameBox.x + 12, renameBox.y + 12)
  await page.waitForTimeout(250)
  await expect(page.locator('#menu-submenu-demo-submenu-2')).toHaveCount(0)
})

test('abandons a delayed submenu open after moving onto a disabled item', async ({
  page,
}) => {
  await page.goto('/ui/menu')
  await waitForRuntime(page)

  await page.locator('#menu-submenu-demo-button').click()
  const organizeBox = await page
    .getByRole('menuitem', { name: 'Organize' })
    .boundingBox()
  const exportBox = await page
    .getByRole('menuitem', { name: 'Export' })
    .boundingBox()
  expect(organizeBox).not.toBeNull()
  expect(exportBox).not.toBeNull()
  if (organizeBox === null || exportBox === null) {
    return
  }

  await page.mouse.move(organizeBox.x + 12, organizeBox.y + 12)
  await page.mouse.move(exportBox.x + 12, exportBox.y + 12)
  await page.waitForTimeout(300)
  await expect(page.locator('#menu-submenu-demo-items')).toBeVisible()
  await expect(page.locator('#menu-submenu-demo-submenu-2')).toHaveCount(0)
})

test('selects a root leaf after holding and dragging from the trigger', async ({
  page,
}) => {
  await page.goto('/ui/menu')
  await waitForRuntime(page)

  const trigger = page.locator('#menu-submenu-demo-button')
  await trigger.scrollIntoViewIfNeeded()
  const triggerBox = await trigger.boundingBox()
  expect(triggerBox).not.toBeNull()
  if (triggerBox === null) {
    return
  }

  await page.mouse.move(
    triggerBox.x + triggerBox.width / 2,
    triggerBox.y + triggerBox.height / 2,
  )
  await page.mouse.down()
  const rename = page.getByRole('menuitem', { name: 'Rename' })
  await expect(rename).toBeVisible()
  const renameBox = await rename.boundingBox()
  expect(renameBox).not.toBeNull()
  if (renameBox === null) {
    await page.mouse.up()
    return
  }

  await page.mouse.move(renameBox.x + 12, renameBox.y + 12)
  await expect(rename).toHaveAttribute('data-active', '')
  await page.waitForTimeout(250)
  await page.mouse.up()
  await expect(page.getByText('Selected: Rename')).toBeVisible()
  await expect(page.locator('#menu-submenu-demo-items')).toHaveCount(0)
})

test('releasing on a submenu trigger does not select its active child', async ({
  page,
}) => {
  await page.goto('/ui/menu')
  await waitForRuntime(page)

  const trigger = page.locator('#menu-submenu-demo-button')
  await trigger.scrollIntoViewIfNeeded()
  const triggerBox = await trigger.boundingBox()
  expect(triggerBox).not.toBeNull()
  if (triggerBox === null) {
    return
  }

  await page.mouse.move(
    triggerBox.x + triggerBox.width / 2,
    triggerBox.y + triggerBox.height / 2,
  )
  await page.mouse.down()

  const organize = page.getByRole('menuitem', { name: 'Organize' })
  const organizeBox = await organize.boundingBox()
  expect(organizeBox).not.toBeNull()
  if (organizeBox === null) {
    await page.mouse.up()
    return
  }

  await page.mouse.move(organizeBox.x + 12, organizeBox.y + 12)
  await expect(page.locator('#menu-submenu-demo-submenu-2')).toBeVisible()
  await page.waitForTimeout(250)
  await page.mouse.up()

  await expect(page.locator('#menu-submenu-demo-items')).toBeVisible()
  await expect(page.locator('#menu-submenu-demo-submenu-2')).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'Submenus' })
      .getByText('Choose an action.'),
  ).toBeVisible()
})

test('flips a child panel into a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  await page.goto('/ui/menu')
  await waitForRuntime(page)

  await page.locator('#menu-submenu-demo-button').click()
  await page.getByRole('menuitem', { name: 'Organize' }).click()
  const childMenu = page.locator('#menu-submenu-demo-submenu-2')
  await expect(childMenu).toBeVisible()
  await expect(childMenu).toHaveAttribute('data-placement', 'left')

  const box = await childMenu.boundingBox()
  expect(box).not.toBeNull()
  if (box !== null) {
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
  }
})

test('keeps pointer travel into a child panel open and reopens a modal tree', async ({
  page,
}) => {
  await page.goto('/ui/menu')
  await waitForRuntime(page)

  const trigger = page.locator('#menu-submenu-demo-button')
  const organize = page.getByRole('menuitem', { name: 'Organize' })
  const childMenu = page.locator('#menu-submenu-demo-submenu-2')

  await trigger.click()
  await organize.hover()
  await expect(childMenu).toBeVisible()

  const box = await childMenu.boundingBox()
  expect(box).not.toBeNull()
  if (box === null) {
    return
  }
  await page.mouse.move(box.x + 12, box.y + 12)
  await page.waitForTimeout(350)
  await expect(childMenu).toBeVisible()

  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(childMenu).toHaveCount(0)
  await trigger.click()
  await organize.click()
  await expect(childMenu).toBeVisible()
  await expect(
    childMenu.evaluate(element => element.closest('[inert]') === null),
  ).resolves.toBe(true)
})

test('exposes portaled children to assistive technology and lets Tab leave', async ({
  page,
}) => {
  await page.goto('/ui/menu')
  await waitForRuntime(page)

  const trigger = page.locator('#menu-submenu-demo-button')
  const rootMenu = page.locator('#menu-submenu-demo-items')
  const organize = page.getByRole('menuitem', { name: 'Organize' })
  const childMenu = page.locator('#menu-submenu-demo-submenu-2')

  await trigger.click()
  await organize.click()
  await expect(childMenu).toBeVisible()
  await expect(organize).not.toHaveAttribute('aria-expanded')
  await expect(organize).toHaveAttribute('data-open', '')
  const childMenuId = await childMenu.getAttribute('id')
  expect(childMenuId).not.toBeNull()
  await expect(organize).toHaveAttribute('aria-controls', childMenuId ?? '')

  const results = await new AxeBuilder({ page })
    .include('#menu-submenu-demo-button')
    .include('#menu-submenu-demo-items')
    .include('#menu-submenu-demo-submenu-2')
    .analyze()
  expect(results.violations).toEqual([])

  await rootMenu.focus()
  await page.keyboard.press('Tab')
  await expect(rootMenu).toHaveCount(0)
  await expect(trigger).not.toBeFocused()
})
