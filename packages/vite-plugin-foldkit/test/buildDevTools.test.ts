import { type HTMLButtonElement, Window } from 'happy-dom'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { MessageChannel } from 'node:worker_threads'
import { type Plugin, createBuilder } from 'vite'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { foldkitBuildToken } from '../src/buildToken.ts'
import { foldkit, foldkitBuild } from '../src/index.ts'

const FIXTURE_ROOT = resolve(import.meta.dirname, 'fixtures/build-devtools')
const DEVTOOLS_ROOT = resolve(import.meta.dirname, '../../devtools')

const buildFixture = async (
  isPrerendered: boolean,
  dependencySection: 'dependencies' | 'devDependencies',
  isStandalone = false,
) => {
  const temporaryDirectory = resolve(FIXTURE_ROOT, 'dist-test')
  await mkdir(temporaryDirectory, { recursive: true })
  const root = await mkdtemp(resolve(temporaryDirectory, 'application-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))

  for (const name of ['application.ts', 'entry.client.ts', 'entry.server.ts']) {
    await copyFile(resolve(FIXTURE_ROOT, name), resolve(root, name))
  }

  await writeFile(
    resolve(root, 'package.json'),
    JSON.stringify({
      name: 'devtools-build-fixture',
      type: 'module',
      [dependencySection]: { '@foldkit/devtools': '0.170.0' },
    }),
  )
  await mkdir(resolve(root, 'node_modules/@foldkit'), { recursive: true })
  await symlink(
    DEVTOOLS_ROOT,
    resolve(root, 'node_modules/@foldkit/devtools'),
    'junction',
  )

  const overlayEnvironments: Array<string> = []
  const trackOverlay: Plugin = {
    name: 'test:track-overlay-environments',
    transform(_code, id) {
      if (id === '\0virtual:foldkit-devtools-overlay') {
        overlayEnvironments.push(this.environment.name)
      }
    },
  }
  const buildOptions = {
    clientOutDir: 'client',
    serverOutDir: 'server',
    prerender: isPrerendered,
  }
  const plugins = isStandalone
    ? [
        ...foldkitBuildToken('devtools-build-fixture', false),
        foldkitBuild('/entry.server.ts', {
          clientEntry: '/entry.client.ts',
          ...buildOptions,
        }),
      ]
    : foldkit({
        ssr: {
          serverEntry: '/entry.server.ts',
          clientEntry: '/entry.client.ts',
          build: buildOptions,
        },
      })
  const builder = await createBuilder({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [...plugins, trackOverlay],
    environments: {
      client: {
        build: {
          minify: false,
          rolldownOptions: { output: { format: 'iife' } },
        },
      },
    },
  })
  await builder.buildApp()

  const client = resolve(root, 'client')
  const server = await import(
    pathToFileURL(resolve(root, 'server/fetch.js')).href
  )
  const response: Response = await server.default.fetch(
    new Request('http://localhost/'),
  )
  const html = await response.text()

  if (isPrerendered) {
    expect(await readFile(resolve(client, 'index.html'), 'utf8')).toBe(html)
  }

  return { html, client, overlayEnvironments }
}

const executeClient = async (html: string, client: string) => {
  const window = new Window({
    url: 'http://localhost/',
    settings: {
      enableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      suppressInsecureJavaScriptEnvironmentWarning: true,
    },
  })
  const messageChannels = new Set<MessageChannel>()
  let deferredDrains = 0

  // NOTE: HappyDOM omits the browser primitive used when a Message drain yields.
  Object.defineProperty(window, 'MessageChannel', {
    value: class extends MessageChannel {
      constructor() {
        super()
        messageChannels.add(this)
        this.port2.addEventListener('message', () => {
          deferredDrains += 1
        })
      }
    },
  })
  onTestFinished(async () => {
    for (const channel of messageChannels) {
      channel.port1.close()
      channel.port2.close()
    }
    await window.happyDOM.close()
  })
  window.document.write(html)

  const script = window.document.querySelector('script[type="module"]')
  const source = script?.getAttribute('src')
  if (source === undefined || source === null) {
    throw new Error('The rendered document has no client entry')
  }

  let overlayMounts = 0
  const observer = new window.MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (
          node instanceof window.HTMLElement &&
          node.id === 'foldkit-devtools'
        ) {
          overlayMounts += 1
        }
      }
    }
  })
  observer.observe(window.document.body, { childList: true })
  onTestFinished(() => observer.disconnect())

  window.eval(await readFile(resolve(client, source.slice(1)), 'utf8'))

  return {
    window,
    overlayMounts: () => overlayMounts,
    deferredDrains: () => deferredDrains,
  }
}

const openOverlayAfterBudgetYield = async (
  window: Window,
  badge: HTMLButtonElement,
  deferredDrains: () => number,
) => {
  const previousDrains = deferredDrains()
  const initialTime = window.performance.now()
  const simulatedWorkMs = 10
  const heldFrames: Array<FrameRequestCallback> = []
  let isHoldingFrames = true

  const requestFrame = window.requestAnimationFrame.bind(window)
  const frameSpy = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation(callback =>
      requestFrame(timestamp => {
        if (isHoldingFrames) {
          heldFrames.push(callback)
        } else {
          callback(timestamp)
        }
      }),
    )
  const nowSpy = vi
    .spyOn(window.performance, 'now')
    .mockReturnValue(initialTime)
  const simulateElapsedWork = () => {
    nowSpy
      .mockReturnValue(initialTime + simulatedWorkMs)
      .mockReturnValueOnce(initialTime)
  }

  badge.addEventListener('click', simulateElapsedWork, {
    capture: true,
    once: true,
  })

  try {
    badge.click()
    await expect.poll(deferredDrains).toBeGreaterThan(previousDrains)
  } finally {
    badge.removeEventListener('click', simulateElapsedWork)
    nowSpy.mockRestore()
    frameSpy.mockRestore()
    isHoldingFrames = false

    for (const frame of heldFrames) {
      window.requestAnimationFrame(frame)
    }
  }
}

describe('generated production client DevTools', () => {
  it.each([
    { isPrerendered: false, isStandalone: false },
    { isPrerendered: true, isStandalone: false },
    { isPrerendered: false, isStandalone: true },
    { isPrerendered: true, isStandalone: true },
  ])(
    'registers the overlay before hydration for prerender=$isPrerendered, standalone=$isStandalone',
    async ({ isPrerendered, isStandalone }) => {
      const { html, client, overlayEnvironments } = await buildFixture(
        isPrerendered,
        'dependencies',
        isStandalone,
      )
      const { window, overlayMounts, deferredDrains } = await executeClient(
        html,
        client,
      )

      await expect
        .poll(() => window.document.getElementById('foldkit-devtools'))
        .not.toBeNull()
      const shadow =
        window.document.getElementById('foldkit-devtools')?.shadowRoot
      await expect
        .poll(() => shadow?.querySelector('button.dt-badge'))
        .toBeTruthy()
      const badge = shadow?.querySelector<HTMLButtonElement>('button.dt-badge')
      if (badge === null || badge === undefined) {
        throw new Error('The DevTools badge is not mounted')
      }

      await openOverlayAfterBudgetYield(window, badge, deferredDrains)
      await expect.poll(() => shadow?.querySelector('.dt-panel')).toBeTruthy()
      window.document.querySelector('button')?.click()

      await expect
        .poll(() => window.document.getElementById('increment')?.textContent)
        .toBe('Count 1')
      await expect
        .poll(() => shadow?.querySelector('ul')?.textContent)
        .toContain('ClickedIncrement')
      shadow?.querySelector('ul')?.querySelector('li')?.click()
      await expect.poll(() => shadow?.textContent).toContain('count')
      for (const button of shadow?.querySelectorAll('button') ?? []) {
        if (
          button.getAttribute('role') === 'tab' &&
          button.textContent === 'Message'
        ) {
          button.click()
        }
      }
      await expect
        .poll(() =>
          shadow
            ?.getElementById('dt-inspector-tab-1')
            ?.getAttribute('aria-selected'),
        )
        .toBe('true')
      await expect
        .poll(() => shadow?.getElementById('dt-inspector-panel-1')?.textContent)
        .toContain('ClickedIncrement')
      expect(window.document.getElementById('increment')?.textContent).toBe(
        'Count 1',
      )
      expect(overlayMounts()).toBe(1)
      expect(overlayEnvironments).toEqual(['client'])
    },
  )

  it('keeps a development-only overlay out of the generated production client', async () => {
    const { html, client, overlayEnvironments } = await buildFixture(
      true,
      'devDependencies',
    )
    const { window, overlayMounts } = await executeClient(html, client)

    window.document.querySelector('button')?.click()
    await expect
      .poll(() => window.document.getElementById('increment')?.textContent)
      .toBe('Count 1')
    expect(window.document.getElementById('foldkit-devtools')).toBeNull()
    expect(overlayMounts()).toBe(0)
    expect(overlayEnvironments).toEqual([])
  })
})
