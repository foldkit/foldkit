import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('ui-showcase example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('navigates to the Button component page', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Button', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/button$/)
  })

  test('opens the listbox when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Listbox', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/listbox$/)

    const trigger = page.locator('#listbox-demo-button')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page.getByText('Family member', { exact: true }).click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  test('opens the multi-select listbox when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Listbox', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/listbox$/)

    const trigger = page.locator('#listbox-multi-demo-button')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toHaveText('Select Bluths')

    await page.locator('label[for="listbox-multi-demo-button"]').click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const items = page.locator('#listbox-multi-demo-items')
    await items.getByRole('option', { name: 'Gob Bluth', exact: true }).click()
    await expect(trigger).toHaveText('Gob Bluth')

    await items
      .getByRole('option', { name: 'Buster Bluth', exact: true })
      .click()
    await expect(trigger).toHaveText('2 selected')
  })

  test('opens the grouped listbox and renders its group headings', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Listbox', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/listbox$/)

    const trigger = page.locator('#listbox-grouped-demo-button')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toHaveText('Select a character')

    await page.locator('label[for="listbox-grouped-demo-button"]').click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const items = page.locator('#listbox-grouped-demo-items')
    await expect(items.getByText('Bluths', { exact: true })).toBeVisible()
    await expect(items.getByText('Funkes', { exact: true })).toBeVisible()

    await items
      .getByRole('option', { name: 'Maeby Funke', exact: true })
      .click()
    await expect(trigger).toHaveText('Maeby Funke')
  })

  test('renders the fieldset demos with their descriptions and disabled state', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Fieldset', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/fieldset$/)

    const basicFieldset = page.locator('#fieldset-basic-demo')
    const disabledFieldset = page.locator('#fieldset-disabled-demo')
    const nameDescription = 'As it appears on your government-issued ID.'

    const nameInput = basicFieldset.locator('#fieldset-name-input')
    await expect(nameInput).toBeEnabled()
    await expect(
      basicFieldset.getByText(nameDescription, { exact: true }),
    ).toBeVisible()
    await expect(
      basicFieldset.getByText('A brief introduction about yourself.', {
        exact: true,
      }),
    ).toBeVisible()

    const termsCheckbox = basicFieldset.getByRole('checkbox')
    await expect(termsCheckbox).toHaveAttribute('aria-checked', 'false')
    await termsCheckbox.click()
    await expect(termsCheckbox).toHaveAttribute('aria-checked', 'true')

    await expect(
      disabledFieldset.locator('#fieldset-disabled-name-input'),
    ).toBeDisabled()
    await expect(
      disabledFieldset.locator('#fieldset-disabled-bio-textarea'),
    ).toBeDisabled()
    await expect(
      disabledFieldset.getByText(nameDescription, { exact: true }),
    ).toHaveCount(0)
  })

  test('opens each dialog demo with its own panel content', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Dialog', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/dialog$/)

    const openAndClose = async (
      triggerName: string,
      dialogId: string,
      title: string,
    ): Promise<void> => {
      const heading = page
        .locator(dialogId)
        .getByRole('heading', { name: title, exact: true })

      await page.getByRole('button', { name: triggerName, exact: true }).click()
      await expect(heading).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(heading).toBeHidden()
    }

    await openAndClose('Open Dialog', '#dialog-demo', 'Confirm Action')
    await openAndClose(
      'Open Animated Dialog',
      '#dialog-animated-demo',
      'Confirm Action',
    )
    await openAndClose('Edit filters', '#overlay-dialog-demo', 'Edit filters')
  })

  test('stacks the nested dialogs and dismisses them one at a time', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Dialog', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/dialog$/)

    const settingsTitle = page
      .locator('#nested-dialog-parent-demo')
      .getByRole('heading', { name: 'Project settings', exact: true })
    const deleteTitle = page
      .locator('#nested-dialog-child-demo')
      .getByRole('heading', { name: 'Delete project?', exact: true })

    await page
      .getByRole('button', { name: 'Open project settings', exact: true })
      .click()
    await expect(settingsTitle).toBeVisible()

    await page
      .getByRole('button', { name: 'Delete project', exact: true })
      .click()
    await expect(deleteTitle).toBeVisible()
    await expect(settingsTitle).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(deleteTitle).toBeHidden()
    await expect(settingsTitle).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(settingsTitle).toBeHidden()
  })

  test('opens the menu when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Menu', exact: true }).first().click()
    await expect(page).toHaveURL(/\/menu$/)

    const trigger = page.locator('#menu-basic-demo-button')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page.locator('label[for="menu-basic-demo-button"]').click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  test('opens the popover when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Popover', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/popover$/)

    const trigger = page.locator('#popover-basic-demo-button')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page.locator('label[for="popover-basic-demo-button"]').click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  test('opens the date picker when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Date Picker', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/date-picker$/)

    const trigger = page.locator('#date-picker-basic-demo-popover-button')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page
      .locator('label[for="date-picker-basic-demo-popover-button"]')
      .click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  test('opens the disclosure when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Disclosure', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/disclosure$/)

    const trigger = page.locator('#disclosure-basic-demo-button')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page.locator('label[for="disclosure-basic-demo-button"]').click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  test('focuses the combobox input when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Combobox', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/combobox$/)

    const trigger = page.locator('#combobox-demo-input')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page.locator('label[for="combobox-demo-input"]').click()
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('keeps a combobox panel on its initial side while filtering', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Combobox', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/combobox$/)

    const trigger = page.locator('#combobox-placement-lock-demo-input')
    const panel = page.locator('#combobox-placement-lock-demo-items')
    await page
      .locator('#combobox-placement-lock-demo-input-wrapper')
      .evaluate(element => {
        element.setAttribute(
          'style',
          'position: fixed; left: 32px; bottom: 96px; width: 288px',
        )
      })

    await trigger.focus()
    await expect(panel).toHaveAttribute('data-placement', 'top')

    const isPanelAboveTrigger = async (): Promise<boolean> => {
      const [triggerBox, panelBox] = await Promise.all([
        trigger.boundingBox(),
        panel.boundingBox(),
      ])

      if (triggerBox && panelBox) {
        return panelBox.y + panelBox.height <= triggerBox.y
      } else {
        return false
      }
    }

    await expect.poll(isPanelAboveTrigger).toBe(true)

    const panelHeight = async (): Promise<number> =>
      (await panel.boundingBox())?.height ?? 0

    const expandedPanelHeight = await panelHeight()

    await trigger.fill('z')
    await expect(panel.getByRole('option')).toHaveCount(1)
    await expect(panel).toHaveAttribute('data-placement', 'top')
    await expect.poll(isPanelAboveTrigger).toBe(true)

    const filteredPanelHeight = await panelHeight()
    expect(filteredPanelHeight).toBeLessThan(expandedPanelHeight)

    await trigger.press('Backspace')
    await expect(panel.getByRole('option')).toHaveCount(7)
    await expect(panel).toHaveAttribute('data-placement', 'top')
    await expect.poll(isPanelAboveTrigger).toBe(true)
    await expect.poll(panelHeight).toBeGreaterThan(filteredPanelHeight)
  })

  test('focuses the tooltip trigger when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Tooltip', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/tooltip$/)

    const trigger = page.locator('#tooltip-basic-demo-trigger')

    await page.locator('label[for="tooltip-basic-demo-trigger"]').click()
    await expect(trigger).toBeFocused()
  })

  test('releases the scroll lock when navigating away from an open dialog', async ({
    page,
  }) => {
    const documentOverflow = () =>
      page.evaluate(() => document.documentElement.style.overflow)

    await page.goto('/')
    await page
      .getByRole('link', { name: 'Dialog', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/dialog$/)

    await page.getByRole('button', { name: 'Open Dialog', exact: true }).click()
    await expect.poll(documentOverflow).toBe('hidden')

    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await expect.poll(documentOverflow).not.toBe('hidden')
  })
})
