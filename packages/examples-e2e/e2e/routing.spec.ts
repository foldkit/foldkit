import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import * as Page from '../page'

type ManifestEntry = Readonly<{
  file: string
  imports?: ReadonlyArray<string>
  isDynamicEntry?: boolean
}>

const staticFiles = (
  manifest: Readonly<Record<string, ManifestEntry>>,
  entry: string,
  visited = new Set<string>(),
): ReadonlySet<string> => {
  const chunk = manifest[entry]
  if (chunk === undefined)
    throw new Error(`Missing emitted manifest entry: ${entry}`)
  if (visited.has(chunk.file)) return visited
  visited.add(chunk.file)
  for (const dependency of chunk.imports ?? [])
    staticFiles(manifest, dependency, visited)
  return visited
}

test.describe('routing example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('navigates to people route', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'People', exact: true }).click()
    await expect(page).toHaveURL(/\/people/)
  })

  test('navigates into the file tree', async ({ page }) => {
    await page.goto('/files')
    await page.getByRole('link', { name: 'documents', exact: true }).click()
    await expect(page).toHaveURL(/\/files\/documents$/)
    await page.getByRole('link', { name: 'taxes', exact: true }).click()
    await expect(page).toHaveURL(/\/files\/documents\/taxes$/)
    await expect(page.getByRole('link', { name: '2024.pdf' })).toBeVisible()
  })

  test('loads a second implementation after boot inside one production runtime', async ({
    page,
  }) => {
    const manifest: Readonly<Record<string, ManifestEntry>> = JSON.parse(
      readFileSync(
        new URL(
          '../../../examples/routing/dist/.vite/manifest.json',
          import.meta.url,
        ),
        'utf8',
      ),
    )
    const moduleChunks: ReadonlyArray<
      Readonly<{ file: string; modules: ReadonlyArray<string> }>
    > = JSON.parse(
      readFileSync(
        new URL(
          '../../../examples/routing/dist/bundle-modules.json',
          import.meta.url,
        ),
        'utf8',
      ),
    )
    const reports = manifest['src/lazy/reports.ts']
    if (reports === undefined)
      throw new Error('Reports is missing from the production manifest')
    expect(reports.isDynamicEntry).toBe(true)
    const initial = staticFiles(manifest, 'lazy.html')
    expect(initial.has(reports.file)).toBe(false)
    const reportsChunk = moduleChunks.find(chunk => chunk.file === reports.file)
    expect(
      reportsChunk?.modules.some(id => id.endsWith('/src/lazy/reports.ts')),
    ).toBe(true)
    for (const chunk of moduleChunks.filter(chunk => initial.has(chunk.file))) {
      expect(
        chunk.modules.some(id => id.endsWith('/src/lazy/reports.ts')),
      ).toBe(false)
    }
    const ids = moduleChunks.flatMap(chunk =>
      chunk.modules.map(id => id.replaceAll('\\', '/')),
    )
    const foldkitRoots = new Set(
      ids.flatMap(id => {
        const match = id.match(
          /^(.*(?:packages\/foldkit|node_modules\/foldkit))\/(?:src|dist)\//,
        )
        return match?.[1] === undefined ? [] : [match[1]]
      }),
    )
    const effectRoots = new Set(
      ids.flatMap(id => {
        const match = id.match(/^(.*\/node_modules\/effect)\/(?:src|dist)\//)
        return match?.[1] === undefined ? [] : [match[1]]
      }),
    )
    expect(foldkitRoots.size).toBe(1)
    expect(effectRoots.size).toBe(1)
    const runtimeModules = ids.filter(id =>
      /(?:packages\/foldkit|node_modules\/(?:foldkit|effect))\/(?:src|dist)\//.test(
        id,
      ),
    )
    expect(new Set(runtimeModules).size).toBe(runtimeModules.length)
    const reportsRequests: Array<string> = []
    let releaseReports: (() => void) | undefined
    const reportsGate = new Promise<void>(resolve => {
      releaseReports = resolve
    })
    await page.route(`**/${reports.file}`, async route => {
      await reportsGate
      await route.continue()
    })
    page.on('request', request => {
      if (new URL(request.url()).pathname === `/${reports.file}`) {
        reportsRequests.push(request.url())
      }
    })
    await page.goto('/lazy.html')
    await expect(
      page.getByRole('heading', { name: 'Home', exact: true }),
    ).toBeVisible()
    expect(reportsRequests).toHaveLength(0)
    expect(
      await page
        .locator('link[rel="modulepreload"]')
        .evaluateAll(links => links.map(link => link.getAttribute('href'))),
    ).not.toContain(`/${reports.file}`)
    const note = page.getByRole('textbox', { name: 'Shell note' })
    await note.fill('Retained shell text')
    const originalNote = await note.elementHandle()
    await page.getByRole('button', { name: 'Open reports' }).click()
    await expect(
      page.getByRole('button', { name: 'Loading reports' }),
    ).toBeVisible()
    await note.focus()
    if (releaseReports === undefined) {
      throw new Error('Reports import gate was not initialized')
    }
    releaseReports()
    await expect(
      page.getByRole('heading', { name: 'Reports loaded after boot' }),
    ).toBeVisible()
    expect(reportsRequests).toHaveLength(1)
    await expect(note).toHaveValue('Retained shell text')
    await expect(note).toBeFocused()
    expect(
      await note.evaluate(
        (element, original) => element === original,
        originalNote,
      ),
    ).toBe(true)
    await page.getByRole('button', { name: 'Increment' }).click()
    await expect(page.getByText('Count: 1', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Home', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Home', exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Open reports' }).click()
    await expect(page.getByText('Count: 1', { exact: true })).toBeVisible()
    expect(reportsRequests).toHaveLength(1)
    await expect(note).toHaveValue('Retained shell text')
  })
})
