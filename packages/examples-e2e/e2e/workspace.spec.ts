import {
  type Locator,
  type Page as PlaywrightPage,
  expect,
  test,
} from '@playwright/test'

import * as Page from '../page'

const RENDER_SETTLE_TIME = 32
const SAVE_SETTLE_TIME = 600
const REPOSITORY_LATENCY = 250
const ACTIVITY_INTERVAL = 20_000

const issueList = (page: PlaywrightPage) =>
  page.getByRole('region', { name: 'Issues', exact: true })

const expectLocation = (page: PlaywrightPage, pathname: string, search = '') =>
  expect(page).toHaveURL(
    url => url.pathname === pathname && url.search === search,
  )

const expectIssueLocation = (
  page: PlaywrightPage,
  issueId: string,
  pagePath = '/',
) =>
  expect(page).toHaveURL(url => {
    const expected = new URL(pagePath, url.origin)
    expected.searchParams.set('issue', issueId)

    return url.pathname === expected.pathname && url.search === expected.search
  })

const chooseListbox = async (
  page: PlaywrightPage,
  button: Locator,
  option: string,
) => {
  await button.click()
  await page
    .getByRole('listbox')
    .getByRole('option', { name: option, exact: true })
    .click()
}

test.describe('workspace example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('a direct issue link opens a standalone editor and closes to All issues', async ({
    page,
  }) => {
    await page.goto('/issues/issue-101')
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      'Build a faster command menu',
    )
    await expect(issueList(page)).toHaveCount(0)
    await page.getByRole('button', { name: 'Close issue', exact: true }).click()
    await expectLocation(page, '/')
    await expect(issueList(page)).toBeVisible()
  })

  test('saving an issue updates the list and survives navigating away and back', async ({
    page,
  }) => {
    await page.goto('/')
    await issueList(page)
      .getByRole('link', { name: /^WSP-101 / })
      .click()
    await expectIssueLocation(page, 'issue-101', '/')
    await page
      .getByLabel('Issue title', { exact: true })
      .fill('Keep every issue view consistent')
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(
      issueList(page).getByRole('link', {
        name: 'WSP-101 Keep every issue view consistent',
      }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Close issue' }).click()
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveCount(0)
    await issueList(page)
      .getByRole('link', { name: /^WSP-102 / })
      .click()
    await issueList(page)
      .getByRole('link', { name: 'WSP-101 Keep every issue view consistent' })
      .click()
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      'Keep every issue view consistent',
    )
  })

  test('a failed save retains its draft and can be retried', async ({
    page,
  }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Fail next save' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'The next save will fail' }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'All issues', exact: true }).click()
    await issueList(page)
      .getByRole('link', { name: /^WSP-101 / })
      .click()
    await page
      .getByLabel('Issue title', { exact: true })
      .fill('Retry without losing this draft')
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(page.getByRole('alert')).toContainText(
      'temporarily unavailable',
    )
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      'Retry without losing this draft',
    )
    await page.getByRole('button', { name: 'Retry save' }).click()
    await expect(
      issueList(page).getByRole('link', {
        name: 'WSP-101 Retry without losing this draft',
      }),
    ).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('closing and reopening an issue retains its fields and pending comment', async ({
    page,
  }) => {
    const draftTitle = 'Keep the command menu draft'
    const draftDescription = 'This work is still in progress.'
    const comment = 'Check the keyboard shortcuts before publishing.'

    await page.goto('/?issue=issue-101')
    await page.getByLabel('Issue title', { exact: true }).fill(draftTitle)
    await page.getByLabel('Description', { exact: true }).fill(draftDescription)
    await page.getByRole('button', { name: 'Status', exact: true }).click()
    await page
      .getByRole('listbox')
      .getByRole('option', { name: 'Todo', exact: true })
      .click()
    await page.getByLabel('Write a comment', { exact: true }).fill(comment)
    await page.getByRole('button', { name: 'Close issue' }).click()

    const drafts = page.getByRole('region', { name: 'Drafts', exact: true })
    const issueDraft = drafts.getByRole('link', {
      name: `WSP-101 ${draftTitle}`,
      exact: true,
    })
    await expect(issueDraft).toBeVisible()
    await issueDraft.click()

    await expectIssueLocation(page, 'issue-101', '/')
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      draftTitle,
    )
    await expect(page.getByLabel('Description', { exact: true })).toHaveValue(
      draftDescription,
    )
    await expect(
      page.getByRole('button', { name: 'Status', exact: true }),
    ).toHaveText('Todo')
    await expect(
      page.getByLabel('Write a comment', { exact: true }),
    ).toHaveValue(comment)
    await expect(
      page.getByText('Draft kept for this session', { exact: true }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Discard changes' }).click()
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      'Build a faster command menu',
    )
    await expect(
      page.getByLabel('Description', { exact: true }),
    ).not.toHaveValue(draftDescription)
    await expect(
      drafts.getByRole('link', {
        name: 'WSP-101 Build a faster command menu',
        exact: true,
      }),
    ).toBeVisible()
    await expect(
      page.getByLabel('Write a comment', { exact: true }),
    ).toHaveValue(comment)
  })

  test('issue drafts survive switching issues and browser history', async ({
    page,
  }) => {
    const firstTitle = 'Retained draft for WSP-101'
    const secondTitle = 'Retained draft for WSP-102'

    await page.goto('/?issue=issue-101')
    await page.getByLabel('Issue title', { exact: true }).fill(firstTitle)
    const drafts = page.getByRole('region', { name: 'Drafts', exact: true })
    const firstIssueDraft = drafts.getByRole('link', {
      name: `WSP-101 ${firstTitle}`,
      exact: true,
    })
    await expect(firstIssueDraft).toBeVisible()
    await issueList(page)
      .getByRole('link', { name: /^WSP-102 / })
      .click()
    await expectIssueLocation(page, 'issue-102', '/')
    await expect(
      page.getByRole('button', { name: 'Status', exact: true }),
    ).toHaveText('Todo')
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      'Keep issue drafts when switching projects',
    )
    await page.getByLabel('Issue title', { exact: true }).fill(secondTitle)

    const secondIssueDraft = drafts.getByRole('link', {
      name: `WSP-102 ${secondTitle}`,
      exact: true,
    })
    await expect(secondIssueDraft).toBeVisible()
    await firstIssueDraft.click()
    await expectIssueLocation(page, 'issue-101', '/')
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      firstTitle,
    )
    await expect(secondIssueDraft).toBeVisible()

    await page.goBack()
    await expectIssueLocation(page, 'issue-102', '/')
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      secondTitle,
    )

    await page.goForward()
    await expectIssueLocation(page, 'issue-101', '/')
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      firstTitle,
    )
  })

  test('dirty issue drafts prompt before reload and saved or discarded fields do not', async ({
    page,
  }) => {
    await page.goto('/?issue=issue-101')
    await page
      .getByLabel('Issue title', { exact: true })
      .fill('Prompt before reload')
    await expect(
      page.getByRole('region', { name: 'Drafts', exact: true }),
    ).toBeVisible()

    const promptType = new Promise<string>(resolve => {
      page.once('dialog', async dialog => {
        resolve(dialog.type())
        await dialog.accept()
      })
    })
    await page.reload()
    expect(await promptType).toBe('beforeunload')

    await page
      .getByLabel('Issue title', { exact: true })
      .fill('Saved before reload')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'All changes saved' }),
    ).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Drafts', exact: true }),
    ).toHaveCount(0)

    let unexpectedPrompts = 0
    page.on('dialog', async dialog => {
      unexpectedPrompts += 1
      await dialog.accept()
    })
    await page.reload()
    expect(unexpectedPrompts).toBe(0)

    await page.getByLabel('Issue title', { exact: true }).fill('Discard me')
    await page.getByRole('button', { name: 'Discard changes' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'All changes saved' }),
    ).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Drafts', exact: true }),
    ).toHaveCount(0)
    await page.reload()
    expect(unexpectedPrompts).toBe(0)
  })

  test('project drafts survive navigation and a pending save settles in its own editor', async ({
    page,
  }) => {
    await page.goto('/projects/platform/settings')
    await page
      .getByLabel('Project name', { exact: true })
      .fill('Platform engineering')
    await page.getByRole('link', { name: 'Experience', exact: true }).click()
    await page
      .getByRole('link', { name: 'Project settings', exact: true })
      .click()
    await expect(page.getByLabel('Project name', { exact: true })).toHaveValue(
      'Experience',
    )
    await page.getByRole('link', { name: 'Platform', exact: true }).click()
    await page
      .getByRole('link', { name: 'Project settings', exact: true })
      .click()
    await expect(page.getByLabel('Project name', { exact: true })).toHaveValue(
      'Platform engineering',
    )

    await page.clock.install()
    await page.clock.pauseAt(new Date())
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await expect(
      page.getByRole('button', { name: 'Saving…', exact: true }),
    ).toBeDisabled()
    await page.getByRole('link', { name: 'Experience', exact: true }).click()
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await page.clock.runFor(SAVE_SETTLE_TIME)
    await expect(
      page.getByRole('heading', { name: 'Experience', exact: true }),
    ).toBeVisible()
    await page
      .getByRole('link', { name: 'Platform engineering', exact: true })
      .click()
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await page
      .getByRole('link', { name: 'Project settings', exact: true })
      .click()
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await expect(page.getByLabel('Project name', { exact: true })).toHaveValue(
      'Platform engineering',
    )
    await expect(
      page.getByRole('status').filter({ hasText: 'Project saved' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Save changes', exact: true }),
    ).toBeDisabled()
  })

  test('a hidden dirty project editor protects reload and discarding it removes the warning', async ({
    page,
  }) => {
    await page.goto('/projects/platform/settings')
    await page
      .getByLabel('Project name', { exact: true })
      .fill('Unfinished project name')
    await page.getByRole('link', { name: 'People', exact: true }).click()

    const prompt = page.waitForEvent('dialog', { timeout: 5000 })
    page.once('dialog', dialog => dialog.accept())
    await page.reload()
    expect((await prompt).type()).toBe('beforeunload')

    await page.getByRole('link', { name: 'Platform', exact: true }).click()
    await page
      .getByRole('link', { name: 'Project settings', exact: true })
      .click()
    await page
      .getByLabel('Project name', { exact: true })
      .fill('Discard this project name')
    await page
      .getByRole('button', { name: 'Discard changes', exact: true })
      .click()
    await expect(page.getByLabel('Project name', { exact: true })).toHaveValue(
      'Platform',
    )

    let unexpectedPrompts = 0
    page.on('dialog', async dialog => {
      unexpectedPrompts += 1
      await dialog.accept()
    })
    await page.reload()
    expect(unexpectedPrompts).toBe(0)
  })

  test('narrow screens open the issue editor directly and close returns to the list', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await issueList(page)
      .getByRole('link', { name: /^WSP-116 / })
      .click()
    await expect(
      page.getByLabel('Issue title', { exact: true }),
    ).toBeInViewport()
    await expect(
      page.getByRole('region', { name: 'Issues', exact: true }),
    ).toBeHidden()
    await page.getByRole('button', { name: 'Close issue', exact: true }).click()
    await expectLocation(page, '/')
    await expect(
      page.getByRole('region', { name: 'Issues', exact: true }),
    ).toBeVisible()
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveCount(0)
  })

  test('project navigation filters canonical data and close returns to that project', async ({
    page,
  }) => {
    await page.goto('/projects/experience')
    await expect(
      page.getByRole('heading', { name: 'Experience', exact: true }),
    ).toBeVisible()
    await issueList(page)
      .getByRole('link', { name: /^WSP-101 / })
      .click()
    await page.getByRole('button', { name: 'Close issue' }).click()
    await expectLocation(page, '/projects/experience')
    await expect(
      page.getByRole('heading', { name: 'Experience', exact: true }),
    ).toBeVisible()
  })

  test('an unknown project cannot open creation for a nonexistent project', async ({
    page,
  }) => {
    await page.goto('/projects/missing-project')
    await expect(
      page.getByRole('heading', { name: 'Project not found' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'New issue', exact: true }),
    ).toHaveCount(0)
    await page.getByRole('link', { name: 'Back to all issues' }).click()
    await expect(
      page.getByRole('button', { name: 'New issue', exact: true }),
    ).toBeVisible()
  })

  test('creating an issue through the Dialog updates shared data and opens its route', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'New issue', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Create issue' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('Title', { exact: true })).toBeFocused()
    await chooseListbox(
      page,
      dialog.getByRole('button', { name: 'Status', exact: true }),
      'In progress',
    )
    await chooseListbox(
      page,
      dialog.getByRole('button', { name: 'Priority', exact: true }),
      'High',
    )
    await chooseListbox(
      page,
      dialog.getByRole('button', { name: 'Project', exact: true }),
      'Platform',
    )
    await dialog
      .getByLabel('Title', { exact: true })
      .fill('Ship a readable workspace example')
    await dialog
      .getByLabel('Description', { exact: true })
      .fill('Exercise real child coordination and shared data.')
    await dialog
      .getByRole('button', { name: 'Create issue', exact: true })
      .click()
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      'Ship a readable workspace example',
    )
    await expectIssueLocation(page, 'issue-117', '/')
    await expect(
      page.getByRole('button', { name: 'Status', exact: true }),
    ).toHaveText('In progress')
    await expect(
      page.getByRole('button', { name: 'Priority', exact: true }),
    ).toHaveText('High')
    await expect(
      page.getByRole('button', { name: 'Project', exact: true }),
    ).toHaveText('Platform')
    await expect(dialog).not.toBeVisible()
    await expect(
      issueList(page).getByRole('link', {
        name: 'WSP-117 Ship a readable workspace example',
      }),
    ).toBeVisible()
  })

  test('creating from a Board column keeps its project and status defaults', async ({
    page,
  }) => {
    const title = 'Create this issue from the board column'

    await page.goto('/projects/experience/board')
    await page
      .getByRole('button', {
        name: 'Create issue in In progress',
        exact: true,
      })
      .click()

    const dialog = page.getByRole('dialog', { name: 'Create issue' })
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: 'Project', exact: true }),
    ).toHaveText('Experience')
    await expect(
      dialog.getByRole('button', { name: 'Status', exact: true }),
    ).toHaveText('In progress')

    await dialog.getByLabel('Title', { exact: true }).fill(title)
    await dialog
      .getByRole('button', { name: 'Create issue', exact: true })
      .click()

    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      title,
    )
    await expect(
      page.getByRole('button', { name: 'Project', exact: true }),
    ).toHaveText('Experience')
    await expect(
      page.getByRole('button', { name: 'Status', exact: true }),
    ).toHaveText('In progress')

    await page.getByRole('button', { name: 'Close issue', exact: true }).click()
    await expectLocation(page, '/projects/experience/board')
    await expect(
      page
        .getByRole('list', { name: 'In progress issues', exact: true })
        .getByRole('link', { name: title, exact: true }),
    ).toBeVisible()
  })

  test('search and status filters combine without changing shared issues', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('searchbox', { name: 'Search issues' }).fill('issue')
    await chooseListbox(
      page,
      page.getByRole('button', { name: 'Filter by status', exact: true }),
      'Todo',
    )
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-106 / }),
    ).toBeVisible()
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-112 / }),
    ).toHaveCount(0)
    await page
      .getByRole('searchbox', { name: 'Search issues' })
      .fill('no issue matches this')
    await expect(
      page.getByRole('heading', { name: 'No matching issues' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-112 / }),
    ).toBeVisible()
  })

  test('a filtered deep link restores its controls and results after reload', async ({
    page,
  }) => {
    const search = page.getByRole('searchbox', {
      name: 'Search issues',
      exact: true,
    })
    const status = page.getByLabel('Filter by status', { exact: true })
    const sort = page.getByLabel('Sort issues', { exact: true })
    const group = page.getByLabel('Group issues', { exact: true })
    const filteredSearch =
      '?search=issue&status=Todo&sort=Priority&group=Project'

    await page.goto(`/${filteredSearch}`)
    await expectLocation(page, '/', filteredSearch)
    await expect(search).toHaveValue('issue')
    await expect(status).toHaveText('Todo')
    await expect(sort).toHaveText('Priority')
    await expect(group).toHaveText('Project')
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-102 / }),
    ).toBeVisible()
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-106 / }),
    ).toBeVisible()
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-103 / }),
    ).toHaveCount(0)

    await page.reload()
    await expectLocation(page, '/', filteredSearch)
    await expect(search).toHaveValue('issue')
    await expect(status).toHaveText('Todo')
    await expect(sort).toHaveText('Priority')
    await expect(group).toHaveText('Project')
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-102 / }),
    ).toBeVisible()
  })

  test('Back and Forward restore filters on distinct issue routes', async ({
    page,
  }) => {
    const search = page.getByRole('searchbox', {
      name: 'Search issues',
      exact: true,
    })
    const status = page.getByLabel('Filter by status', { exact: true })
    const group = page.getByLabel('Group issues', { exact: true })

    await page.goto('/?search=command&status=InProgress')
    await expect(search).toHaveValue('command')
    await expect(status).toHaveText('In progress')

    await page.getByRole('link', { name: 'Experience', exact: true }).click()
    await expectLocation(page, '/projects/experience')
    await search.fill('issue')
    await chooseListbox(page, status, 'Todo')
    await chooseListbox(page, group, 'Project')
    await expectLocation(
      page,
      '/projects/experience',
      '?search=issue&status=Todo&group=Project',
    )

    await page.goBack()
    await expectLocation(
      page,
      '/projects/experience',
      '?search=issue&status=Todo',
    )
    await expect(search).toHaveValue('issue')
    await expect(status).toHaveText('Todo')
    await expect(group).toHaveText('None')

    await page.goBack()
    await expectLocation(page, '/projects/experience', '?search=issue')
    await expect(search).toHaveValue('issue')
    await expect(status).toHaveText('All statuses')
    await expect(group).toHaveText('None')

    await page.goBack()
    await expectLocation(page, '/', '?search=command&status=InProgress')
    await expect(search).toHaveValue('command')
    await expect(status).toHaveText('In progress')
    await expect(group).toHaveText('None')

    await page.goForward()
    await expectLocation(page, '/projects/experience', '?search=issue')
    await expect(search).toHaveValue('issue')
    await expect(status).toHaveText('All statuses')
    await expect(group).toHaveText('None')

    await page.goForward()
    await expectLocation(
      page,
      '/projects/experience',
      '?search=issue&status=Todo',
    )
    await expect(search).toHaveValue('issue')
    await expect(status).toHaveText('Todo')
    await expect(group).toHaveText('None')

    await page.goForward()
    await expectLocation(
      page,
      '/projects/experience',
      '?search=issue&status=Todo&group=Project',
    )
    await expect(search).toHaveValue('issue')
    await expect(status).toHaveText('Todo')
    await expect(group).toHaveText('Project')
  })

  test('issue reload and close preserve the filtered page URL', async ({
    page,
  }) => {
    const pagePath =
      '/?search=command&status=InProgress&sort=Priority&group=Status'

    await page.goto(pagePath)
    const issueLink = issueList(page).getByRole('link', {
      name: 'WSP-101 Build a faster command menu',
      exact: true,
    })
    await expect(issueLink).toBeVisible()
    await issueLink.click()
    await expectIssueLocation(page, 'issue-101', pagePath)
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      'Build a faster command menu',
    )

    await page.reload()
    await expectIssueLocation(page, 'issue-101', pagePath)
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      'Build a faster command menu',
    )
    await page.getByRole('button', { name: 'Close issue', exact: true }).click()

    await expectLocation(page, '/', pagePath.slice(1))
    await expect(
      page.getByRole('searchbox', { name: 'Search issues', exact: true }),
    ).toHaveValue('command')
    await expect(
      page.getByLabel('Filter by status', { exact: true }),
    ).toHaveText('In progress')
    await expect(page.getByLabel('Sort issues', { exact: true })).toHaveText(
      'Priority',
    )
    await expect(page.getByLabel('Group issues', { exact: true })).toHaveText(
      'Status',
    )
  })

  test('a modified native member issue link opens a new tab without moving the directory', async ({
    context,
    page,
  }) => {
    await page.goto('/people')
    await page.getByRole('button', { name: 'View Maya Chen' }).click()
    const issueLink = page.getByRole('link', {
      name: 'WSP-101 Build a faster command menu',
      exact: true,
    })
    await expect(issueLink).toHaveAttribute('href', '/people?issue=issue-101')

    const [issuePage] = await Promise.all([
      context.waitForEvent('page', { timeout: 5_000 }),
      issueLink.click({ button: 'middle' }),
    ])

    await expectLocation(page, '/people')
    await expectIssueLocation(issuePage, 'issue-101', '/people')
    await expect(
      issuePage.getByLabel('Issue title', { exact: true }),
    ).toHaveValue('Build a faster command menu')
    await issuePage.close()
  })

  test('malformed filter values use defaults and clear to the canonical URL', async ({
    page,
  }) => {
    const malformedSearch =
      '?search=no-match&status=Blocked&sort=Newest&group=Owner'

    await page.goto(`/${malformedSearch}`)
    await expectLocation(page, '/', malformedSearch)
    await expect(
      page.getByRole('searchbox', { name: 'Search issues', exact: true }),
    ).toHaveValue('no-match')
    await expect(
      page.getByLabel('Filter by status', { exact: true }),
    ).toHaveText('All statuses')
    await expect(page.getByLabel('Sort issues', { exact: true })).toHaveText(
      'Issue number',
    )
    await expect(page.getByLabel('Group issues', { exact: true })).toHaveText(
      'None',
    )
    await expect(
      page.getByRole('heading', { name: 'No matching issues' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expectLocation(page, '/')
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-101 / }),
    ).toBeVisible()
  })

  test('the command shortcut opens the palette and keyboard selection navigates to an issue', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'All issues', exact: true }),
    ).toBeVisible()
    await page
      .getByRole('searchbox', { name: 'Search issues', exact: true })
      .focus()
    const modifier = await page.evaluate(() =>
      /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? 'Meta' : 'Control',
    )
    await page.keyboard.press(`${modifier}+k`)

    const dialog = page.getByRole('dialog', { name: 'Go to…', exact: true })
    const search = dialog.getByRole('combobox', {
      name: 'Search issues and projects',
      exact: true,
    })

    await expect(dialog).toBeVisible()
    await expect(search).toBeFocused()
    await search.fill('WSP-10')
    await expect(
      dialog.getByRole('option', {
        name: 'WSP-101 Build a faster command menu',
        exact: true,
      }),
    ).toHaveAttribute('aria-selected', 'true')
    await search.press('ArrowDown')
    await expect(
      dialog.getByRole('option', {
        name: 'WSP-102 Keep issue drafts when switching projects',
        exact: true,
      }),
    ).toHaveAttribute('aria-selected', 'true')
    await search.press('Enter')

    await expectIssueLocation(page, 'issue-102', '/')
    await expect(dialog).not.toBeVisible()
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      'Keep issue drafts when switching projects',
    )
  })

  test('background activity waits for the full 20-second interval', async ({
    page,
  }) => {
    await page.clock.install()
    await page.clock.pauseAt(new Date('2030-01-01T12:00:00.000Z'))
    await page.goto('/settings')
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await expect(
      page.getByText('Loading workspace…', { exact: true }),
    ).toBeVisible()
    await page.clock.runFor(REPOSITORY_LATENCY)

    await expect(
      page.getByText('0 activity events requested', { exact: true }),
    ).toBeVisible()

    await page.clock.runFor(ACTIVITY_INTERVAL - RENDER_SETTLE_TIME - 1)
    await expect(
      page.getByText('0 activity events requested', { exact: true }),
    ).toBeVisible()

    await page.clock.runFor(RENDER_SETTLE_TIME + 1)
    await expect(
      page.getByText('1 activity events requested', { exact: true }),
    ).toBeVisible()

    await page.clock.runFor(REPOSITORY_LATENCY)
    await expect(
      page.getByRole('button', { name: 'Notifications', exact: true }),
    ).toHaveAccessibleDescription('1 unread notification')
  })

  test('a saved sidebar view restores its settings and deleting it returns to all issues', async ({
    page,
  }) => {
    await page.goto('/')
    const search = page.getByRole('searchbox', {
      name: 'Search issues',
      exact: true,
    })
    const status = page.getByLabel('Filter by status', { exact: true })
    const sort = page.getByLabel('Sort issues', { exact: true })
    const group = page.getByLabel('Group issues', { exact: true })
    const viewName = 'Ready issue work'

    await search.fill('issue')
    await chooseListbox(page, status, 'Todo')
    await chooseListbox(page, sort, 'Priority')
    await chooseListbox(page, group, 'Project')
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-102 / }),
    ).toBeVisible()
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-106 / }),
    ).toBeVisible()
    await page.getByLabel('Saved view name', { exact: true }).fill(viewName)
    await page.getByRole('button', { name: 'Save view', exact: true }).click()

    const savedView = page
      .getByRole('region', { name: 'Saved views', exact: true })
      .getByRole('link', { name: viewName, exact: true })

    await expect(savedView).toBeVisible()
    await expect(savedView).toHaveAttribute(
      'href',
      '/views/view-1?search=issue&status=Todo&sort=Priority&group=Project',
    )
    await search.fill('milestones')
    await chooseListbox(page, status, 'All statuses')
    await chooseListbox(page, sort, 'Issue number')
    await chooseListbox(page, group, 'None')
    await expectLocation(page, '/', '?search=milestones')
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-103 / }),
    ).toBeVisible()
    await savedView.click()

    await expectLocation(
      page,
      '/views/view-1',
      '?search=issue&status=Todo&sort=Priority&group=Project',
    )
    await expect(
      page.getByRole('heading', { name: viewName, exact: true }),
    ).toBeVisible()
    await expect(search).toHaveValue('issue')
    await expect(status).toHaveText('Todo')
    await expect(sort).toHaveText('Priority')
    await expect(group).toHaveText('Project')
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-102 / }),
    ).toBeVisible()
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-106 / }),
    ).toBeVisible()
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-103 / }),
    ).toHaveCount(0)
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-112 / }),
    ).toHaveCount(0)

    await page
      .getByRole('button', { name: `Delete view ${viewName}`, exact: true })
      .click()
    await expectLocation(
      page,
      '/',
      '?search=issue&status=Todo&sort=Priority&group=Project',
    )
    await expect(search).toHaveValue('issue')
    await expect(status).toHaveText('Todo')
    await expect(sort).toHaveText('Priority')
    await expect(group).toHaveText('Project')
    await expect(savedView).toHaveCount(0)
  })

  test('a saved-view issue panel survives reload without session preset metadata', async ({
    page,
  }) => {
    const search = page.getByRole('searchbox', {
      name: 'Search issues',
      exact: true,
    })
    const status = page.getByLabel('Filter by status', { exact: true })
    const sort = page.getByLabel('Sort issues', { exact: true })
    const group = page.getByLabel('Group issues', { exact: true })
    const viewName = 'Reloadable issue work'
    const savedViewPath = '/views/view-1'
    const savedViewSearch =
      '?search=issue&status=Todo&sort=Priority&group=Project'
    const pagePath = `${savedViewPath}${savedViewSearch}`

    await page.goto('/')
    await search.fill('issue')
    await chooseListbox(page, status, 'Todo')
    await chooseListbox(page, sort, 'Priority')
    await chooseListbox(page, group, 'Project')
    await page.getByLabel('Saved view name', { exact: true }).fill(viewName)
    await page.getByRole('button', { name: 'Save view', exact: true }).click()

    const savedView = page
      .getByRole('region', { name: 'Saved views', exact: true })
      .getByRole('link', { name: viewName, exact: true })
    await expect(savedView).toHaveAttribute('href', pagePath)
    await savedView.click()
    await expectLocation(page, savedViewPath, savedViewSearch)
    await issueList(page)
      .getByRole('link', { name: /^WSP-102 / })
      .click()
    await expectIssueLocation(page, 'issue-102', pagePath)

    await page.reload()
    await expectIssueLocation(page, 'issue-102', pagePath)
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      'Keep issue drafts when switching projects',
    )
    await page.getByRole('button', { name: 'Close issue', exact: true }).click()

    await expectLocation(page, savedViewPath, savedViewSearch)
    await expect(
      page.getByRole('heading', { name: 'Filtered issues', exact: true }),
    ).toBeVisible()
    await expect(search).toHaveValue('issue')
    await expect(status).toHaveText('Todo')
    await expect(sort).toHaveText('Priority')
    await expect(group).toHaveText('Project')
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-102 / }),
    ).toBeVisible()
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-106 / }),
    ).toBeVisible()
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-103 / }),
    ).toHaveCount(0)
    await expect(
      issueList(page).getByRole('link', { name: /^WSP-112 / }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: viewName, exact: true }),
    ).toHaveCount(0)
  })

  test('a keyboard cross-column drop updates issue details and returns to the same board', async ({
    page,
  }) => {
    await page.goto('/projects/experience/board')
    const board = page.getByRole('region', { name: 'Issue board', exact: true })
    const todo = board.getByRole('list', { name: 'Todo issues', exact: true })
    const inProgress = board.getByRole('list', {
      name: 'In progress issues',
      exact: true,
    })
    const title = 'Build a faster command menu'

    const handle = board.getByRole('button', {
      name: 'Drag WSP-101',
      exact: true,
    })
    await expect(handle).toBeVisible()
    await page.clock.install()
    await page.clock.pauseAt(new Date())
    await handle.focus()
    await handle.press('Space')
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await handle.press('Shift+Tab')
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await handle.press('Space')
    await page.clock.runFor(RENDER_SETTLE_TIME)

    await expect(todo.getByText(title, { exact: true })).toBeVisible()
    await expect(inProgress.getByText(title, { exact: true })).toHaveCount(0)
    await expect(
      todo.getByRole('link', { name: title, exact: true }),
    ).toHaveCount(0)
    await expect(handle).toBeFocused()
    await expect(handle).toHaveAttribute('aria-disabled', 'true')
    await page.clock.runFor(SAVE_SETTLE_TIME)
    await expect(handle).toHaveAttribute('aria-disabled', 'false')
    await expect(
      todo.getByRole('link', { name: title, exact: true }),
    ).toBeVisible()

    await todo.getByRole('link', { name: title, exact: true }).click()
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await expectIssueLocation(page, 'issue-101', '/projects/experience/board')
    await expect(
      page.getByRole('button', { name: 'Status', exact: true }),
    ).toHaveText('Todo')
    await page.getByRole('button', { name: 'Close issue', exact: true }).click()
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await expectLocation(page, '/projects/experience/board')
    await expect(
      todo.getByRole('button', { name: 'Drag WSP-101', exact: true }),
    ).toBeVisible()
  })

  test('keyboard drag reorders project issues and retains the order across navigation', async ({
    page,
  }) => {
    await page.goto('/projects/experience/board')
    const board = page.getByRole('region', { name: 'Issue board', exact: true })
    const todo = board.getByRole('list', { name: 'Todo issues', exact: true })
    const firstTitle = 'Polish the empty project state'
    const secondTitle = 'Improve keyboard focus in issue details'

    await expect(
      todo
        .getByRole('listitem')
        .nth(0)
        .getByRole('link', { name: firstTitle, exact: true }),
    ).toBeVisible()
    const secondHandle = todo.getByRole('button', {
      name: 'Drag WSP-106',
      exact: true,
    })
    await page.clock.install()
    await page.clock.pauseAt(new Date())
    await secondHandle.focus()
    await secondHandle.press('Space')
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await secondHandle.press('ArrowUp')
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await secondHandle.press('Space')
    await page.clock.runFor(RENDER_SETTLE_TIME)

    await expect(todo.getByRole('listitem').nth(0)).toContainText(secondTitle)
    await expect(todo.getByRole('listitem').nth(1)).toContainText(firstTitle)
    await expect(secondHandle).toBeFocused()
    await expect(secondHandle).toHaveAttribute('aria-disabled', 'true')
    await page.clock.runFor(SAVE_SETTLE_TIME)
    await expect(secondHandle).toHaveAttribute('aria-disabled', 'false')
    await expect(
      todo
        .getByRole('listitem')
        .nth(0)
        .getByRole('link', { name: secondTitle, exact: true }),
    ).toBeVisible()

    await page.getByRole('link', { name: 'Overview', exact: true }).click()
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await expectLocation(page, '/projects/experience/overview')
    await page.getByRole('link', { name: 'Board', exact: true }).click()
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await expectLocation(page, '/projects/experience/board')
    await expect(
      todo
        .getByRole('listitem')
        .nth(0)
        .getByRole('link', { name: secondTitle, exact: true }),
    ).toBeVisible()
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await secondHandle.focus()
    await secondHandle.press('Space')
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await secondHandle.press('ArrowDown')
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await secondHandle.press('Space')
    await page.clock.runFor(RENDER_SETTLE_TIME)

    await expect(todo.getByRole('listitem').nth(0)).toContainText(firstTitle)
    await expect(todo.getByRole('listitem').nth(1)).toContainText(secondTitle)
  })

  test('posting a comment preserves a dirty issue draft and remains visible after reopening', async ({
    page,
  }) => {
    await page.goto('/?issue=issue-101')
    const activity = page.getByRole('region', { name: 'Activity', exact: true })
    const comment = 'Reviewed the command menu with the team.'
    const draftTitle = 'Keep this draft while adding a comment'

    await page.getByLabel('Issue title', { exact: true }).fill(draftTitle)
    await page.getByLabel('Write a comment', { exact: true }).fill(comment)
    await page
      .getByRole('button', { name: 'Post comment', exact: true })
      .click()
    await expect(activity.getByText(comment, { exact: true })).toBeVisible()
    await expect(
      page.getByLabel('Write a comment', { exact: true }),
    ).toHaveValue('')
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      draftTitle,
    )

    await page.getByRole('button', { name: 'Close issue', exact: true }).click()
    await issueList(page)
      .getByRole('link', { name: /^WSP-101 / })
      .click()
    await expect(activity.getByText(comment, { exact: true })).toHaveCount(1)
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      draftTitle,
    )
  })

  test('a pointer drop stays in its target column before the save finishes', async ({
    page,
  }) => {
    await page.goto('/projects/experience/board')
    const board = page.getByRole('region', { name: 'Issue board', exact: true })
    const target = board.getByRole('list', {
      name: 'In progress issues',
      exact: true,
    })
    const handle = board.getByRole('button', {
      name: 'Drag WSP-106',
      exact: true,
    })
    await expect(handle).toBeVisible()
    const handleBox = await handle.boundingBox()
    const targetBox = await target.boundingBox()
    if (!handleBox || !targetBox) {
      throw new Error('Expected visible board drag targets')
    }

    await page.clock.install()
    await page.clock.pauseAt(new Date())
    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    )
    await page.mouse.down()
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
    )
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await page.mouse.up()
    await page.clock.runFor(RENDER_SETTLE_TIME)

    await expect(
      target.getByRole('button', { name: 'Drag WSP-106', exact: true }),
    ).toBeVisible()
    await expect(handle).toHaveAttribute('aria-disabled', 'true')

    await page.clock.runFor(SAVE_SETTLE_TIME)
    await expect(
      target.getByRole('button', { name: 'Drag WSP-106', exact: true }),
    ).toBeVisible()
    await expect(handle).toHaveAttribute('aria-disabled', 'false')
  })

  test('a board move stays in place before the save finishes and preserves keyboard focus', async ({
    page,
  }) => {
    await page.goto('/projects/experience/board')
    const board = page.getByRole('region', { name: 'Issue board', exact: true })
    const todo = board.getByRole('list', { name: 'Todo issues', exact: true })
    const handle = board.getByRole('button', {
      name: 'Drag WSP-106',
      exact: true,
    })
    await expect(handle).toBeVisible()
    await page.clock.install()
    await page.clock.pauseAt(new Date())
    await handle.focus()
    await handle.press('Space')
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await handle.press('ArrowUp')
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await handle.press('Space')
    await page.clock.runFor(RENDER_SETTLE_TIME)

    await expect(todo.getByRole('listitem').first()).toContainText('WSP-106')
    await expect(handle).toBeFocused()
    await expect(handle).toHaveAttribute('aria-disabled', 'true')

    await page.clock.runFor(SAVE_SETTLE_TIME)
    await expect(todo.getByRole('listitem').first()).toContainText('WSP-106')
    await expect(handle).toBeFocused()
    await expect(handle).toHaveAttribute('aria-disabled', 'false')
  })

  test('a cross-column drop stays in its new status before saving and keeps keyboard focus', async ({
    page,
  }) => {
    await page.goto('/projects/experience/board')
    const board = page.getByRole('region', { name: 'Issue board', exact: true })
    const inProgress = board.getByRole('list', {
      name: 'In progress issues',
      exact: true,
    })
    const handle = board.getByRole('button', {
      name: 'Drag WSP-106',
      exact: true,
    })
    await expect(handle).toBeVisible()
    await page.clock.install()
    await page.clock.pauseAt(new Date())
    await handle.focus()
    await handle.press('Space')
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await handle.press('Tab')
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await handle.press('Space')
    await page.clock.runFor(RENDER_SETTLE_TIME)

    await expect(
      inProgress.getByRole('button', { name: 'Drag WSP-106', exact: true }),
    ).toBeVisible()
    await expect(handle).toBeFocused()
    await expect(handle).toHaveAttribute('aria-disabled', 'true')

    await page.clock.runFor(SAVE_SETTLE_TIME)
    await expect(
      inProgress.getByRole('button', { name: 'Drag WSP-106', exact: true }),
    ).toBeVisible()
    await expect(handle).toBeFocused()
    await expect(handle).toHaveAttribute('aria-disabled', 'false')
  })

  test('a retained issue save settles while another issue is open', async ({
    page,
  }) => {
    await page.goto('/?issue=issue-101')
    await expect(page.getByLabel('Issue title', { exact: true })).toBeVisible()
    await page.clock.install()
    await page.clock.pauseAt(new Date())

    await page
      .getByLabel('Issue title', { exact: true })
      .fill('Saved while another issue is open')
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await issueList(page)
      .getByRole('link', { name: /^WSP-102 / })
      .click()
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await expectIssueLocation(page, 'issue-102', '/')
    await page.clock.runFor(SAVE_SETTLE_TIME)

    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      'Keep issue drafts when switching projects',
    )
    const savedIssueLink = issueList(page).getByRole('link', {
      name: 'WSP-101 Saved while another issue is open',
    })
    await expect(savedIssueLink).toBeVisible()

    await savedIssueLink.click()
    await page.clock.runFor(RENDER_SETTLE_TIME)
    await expectIssueLocation(page, 'issue-101', '/')
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      'Saved while another issue is open',
    )
    await expect(
      page.getByRole('button', { name: 'Save changes', exact: true }),
    ).toBeDisabled()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(
      issueList(page).getByRole('link', {
        name: 'WSP-102 Keep issue drafts when switching projects',
      }),
    ).toBeVisible()
  })

  test('opening a notification preserves unread state and selecting it opens the issue', async ({
    page,
  }) => {
    await page.goto('/settings')
    await page
      .getByRole('button', { name: 'Simulate activity', exact: true })
      .click()
    await expect(page.getByText('1 activity events requested')).toBeVisible()

    const notificationsButton = page.getByRole('button', {
      name: 'Notifications',
      exact: true,
    })
    await expect(notificationsButton).toHaveAccessibleDescription(
      '1 unread notification',
    )
    await notificationsButton.click()

    const notificationsDialog = page.getByRole('dialog', {
      name: 'Notifications',
      exact: true,
    })
    const notification = notificationsDialog
      .getByRole('listitem')
      .filter({ hasText: 'WSP-101' })
    await expect(notification).toContainText('Alex Rivera commented on WSP-101')
    await expect(
      notification.getByRole('button', {
        name: 'Mark as read: WSP-101',
        exact: true,
      }),
    ).toBeVisible()
    await expect(notificationsButton).toHaveAccessibleDescription(
      '1 unread notification',
    )

    await notification.getByRole('button').first().click()

    await expectIssueLocation(page, 'issue-101', '/settings')
    await expect(notificationsDialog).toHaveCount(0)
    await expect(notificationsButton).toHaveAccessibleDescription(
      '0 unread notifications',
    )
    await expect(page.getByLabel('Issue title', { exact: true })).toHaveValue(
      'Build a faster command menu',
    )
  })

  test('assignment and read state stay scoped to their recipient', async ({
    page,
  }) => {
    await page.goto('/settings')
    const simulateActivity = page.getByRole('button', {
      name: 'Simulate activity',
      exact: true,
    })
    const notificationsButton = page.getByRole('button', {
      name: 'Notifications',
      exact: true,
    })

    await simulateActivity.click()
    await expect(notificationsButton).toHaveAccessibleDescription(
      '1 unread notification',
    )
    await simulateActivity.click()
    await expect(notificationsButton).toHaveAccessibleDescription(
      '2 unread notifications',
    )
    await simulateActivity.click()
    await expect(notificationsButton).toHaveAccessibleDescription(
      '3 unread notifications',
    )

    await notificationsButton.click()
    const notificationsDialog = page.getByRole('dialog', {
      name: 'Notifications',
      exact: true,
    })
    await expect(notificationsDialog).toContainText(
      'Alex Rivera assigned you to WSP-102',
    )
    await notificationsButton.click()

    await chooseListbox(
      page,
      page.getByRole('button', { name: 'Active member', exact: true }),
      'Jordan Lee',
    )
    await expect(notificationsButton).toHaveAccessibleDescription(
      '1 unread notification',
    )
    await notificationsButton.click()
    await expect(notificationsDialog.getByRole('listitem')).toHaveCount(1)
    await expect(notificationsDialog).not.toContainText('assigned you to')
    await notificationsDialog
      .getByRole('button', { name: 'Mark all as read', exact: true })
      .click()
    await expect(notificationsButton).toHaveAccessibleDescription(
      '0 unread notifications',
    )
    await notificationsButton.click()

    await chooseListbox(
      page,
      page.getByRole('button', { name: 'Active member', exact: true }),
      'Maya Chen',
    )
    await expect(notificationsButton).toHaveAccessibleDescription(
      '3 unread notifications',
    )
  })
})
