import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createServer, resolveConfig } from 'vite'
import { describe, expect, it, onTestFinished } from 'vitest'

import {
  devToolsOverlayPlugin,
  shouldInjectDevToolsOverlay,
} from '../src/devToolsOverlay.ts'
import { foldkit } from '../src/index.ts'

const COUNTER_ROOT = resolve(import.meta.dirname, '../../../examples/counter')
const HTML = `<!doctype html>
<html>
  <head></head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/entry.ts"></script>
  </body>
</html>`

const OVERLAY_MODULE_ID = 'virtual:foldkit-devtools-overlay'
const DEV_TOOLS_VITE_EXPORTS = { './vite': { import: './dist/vite.js' } }
const DEV_TOOLS_LEGACY_EXPORTS = { '.': './dist/index.js' }

type Fixture = Readonly<{
  section: 'dependencies' | 'devDependencies'
  exports?: Record<string, unknown>
}>

const makeRoot = (maybeFixture?: Fixture): string => {
  const root = mkdtempSync(join(tmpdir(), 'foldkit-devtools-overlay-'))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))

  const dependencySection =
    maybeFixture === undefined
      ? {}
      : { [maybeFixture.section]: { '@foldkit/devtools': '0.138.0' } }
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'app', ...dependencySection }),
  )

  if (maybeFixture !== undefined) {
    const packageRoot = join(root, 'node_modules', '@foldkit', 'devtools')
    mkdirSync(join(packageRoot, 'dist'), { recursive: true })
    writeFileSync(
      join(packageRoot, 'package.json'),
      JSON.stringify({
        name: '@foldkit/devtools',
        type: 'module',
        exports: maybeFixture.exports ?? DEV_TOOLS_VITE_EXPORTS,
      }),
    )
  }

  return root
}

// Vite types both hooks with a plugin-context `this`. Neither reads it, so a
// minimal stand-in is enough to call them.
const PLUGIN_CONTEXT = {
  meta: {
    rollupVersion: '4',
    rolldownVersion: '1',
    viteVersion: '7',
    watchMode: false,
  },
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: (error: unknown): never => {
    throw error
  },
}

// NOTE: this runs the plugin's own hooks against a real resolved build config,
// which is the only coverage of `configResolved` feeding the HTML transform on
// the build command. The development case goes through a real server below.
const transformProductionHtml = async (root: string) => {
  const plugin = devToolsOverlayPlugin()
  const config = await resolveConfig(
    { root, configFile: false, logLevel: 'silent' },
    'build',
  )

  if (
    typeof plugin.configResolved !== 'function' ||
    typeof plugin.transformIndexHtml !== 'object'
  ) {
    throw new Error('DevTools overlay plugin hooks changed shape')
  }

  await plugin.configResolved.call(PLUGIN_CONTEXT, config)

  return plugin.transformIndexHtml.handler.call(PLUGIN_CONTEXT, HTML, {
    path: '/index.html',
    filename: join(root, 'index.html'),
  })
}

const installFoldkit = (root: string): void => {
  const packageRoot = join(root, 'node_modules', 'foldkit')
  mkdirSync(packageRoot, { recursive: true })
  writeFileSync(
    join(packageRoot, 'package.json'),
    JSON.stringify({ name: 'foldkit', type: 'module' }),
  )
}

const linkPackage = (
  root: string,
  packageName: string,
  exports?: Record<string, unknown>,
): void => {
  const sourceDirectory = join(root, `${packageName.replace('/', '-')}-source`)
  mkdirSync(sourceDirectory, { recursive: true })
  writeFileSync(
    join(sourceDirectory, 'package.json'),
    JSON.stringify({
      name: packageName,
      type: 'module',
      ...(exports ? { exports } : {}),
    }),
  )
  mkdirSync(dirname(join(root, 'node_modules', packageName)), {
    recursive: true,
  })
  symlinkSync(sourceDirectory, join(root, 'node_modules', packageName))
}

const runConfigHook = (root: string, command: 'serve' | 'build') => {
  const plugin = devToolsOverlayPlugin()

  if (typeof plugin.config !== 'function') {
    throw new Error('DevTools overlay plugin hooks changed shape')
  }

  return plugin.config.call(
    PLUGIN_CONTEXT,
    { root },
    { command, mode: command === 'serve' ? 'development' : 'production' },
  )
}

// NOTE: the counter's own config supplies the workspace aliases that resolve
// `@foldkit/devtools/vite` to source, and those aliases are what a synthetic
// config would miss while every example is broken. Its plugins are rebuilt
// here so the test does not bind the fixed DevTools MCP relay port.
const createCounterServer = async () => {
  const config = await resolveConfig(
    { root: COUNTER_ROOT, logLevel: 'silent' },
    'serve',
  )

  return createServer({
    root: COUNTER_ROOT,
    configFile: false,
    logLevel: 'silent',
    server: { middlewareMode: true },
    resolve: { alias: config.resolve.alias },
    optimizeDeps: { noDiscovery: true },
    plugins: [foldkit()],
  })
}

describe('DevTools overlay injection', () => {
  it('injects the overlay before the application entry during development', async () => {
    const server = await createCounterServer()
    onTestFinished(() => server.close().catch(() => undefined))

    const transformedHtml = await server.transformIndexHtml('/', HTML)
    const overlayIndex = transformedHtml.indexOf('html-proxy')
    const entryIndex = transformedHtml.indexOf('/src/entry.ts')

    expect(overlayIndex).toBeGreaterThan(-1)
    expect(entryIndex).toBeGreaterThan(overlayIndex)

    const transformedOverlay = await server.transformRequest(OVERLAY_MODULE_ID)

    expect(transformedOverlay?.code).toContain('__setDevToolsOverlay')
    expect(transformedOverlay?.code).toContain('devtools/src/vite')
  })

  it('declares the overlay imports to the dep optimizer during development', () => {
    const root = makeRoot({ section: 'devDependencies' })
    installFoldkit(root)

    expect(runConfigHook(root, 'serve')).toEqual({
      optimizeDeps: {
        include: ['@foldkit/devtools/vite', 'foldkit/devtools-host'],
      },
    })
  })

  it('declares only the DevTools import when foldkit is linked', () => {
    const root = makeRoot({ section: 'devDependencies' })
    linkPackage(root, 'foldkit')

    expect(runConfigHook(root, 'serve')).toEqual({
      optimizeDeps: {
        include: ['@foldkit/devtools/vite'],
      },
    })
  })

  it('declares only the host import when DevTools is linked', () => {
    const root = makeRoot()
    linkPackage(root, '@foldkit/devtools', DEV_TOOLS_VITE_EXPORTS)
    installFoldkit(root)

    expect(runConfigHook(root, 'serve')).toEqual({
      optimizeDeps: {
        include: ['foldkit/devtools-host'],
      },
    })
  })

  it('declares nothing to the dep optimizer when both packages are linked', () => {
    const root = makeRoot()
    linkPackage(root, '@foldkit/devtools', DEV_TOOLS_VITE_EXPORTS)
    linkPackage(root, 'foldkit')

    expect(runConfigHook(root, 'serve')).toBeUndefined()
  })

  it('declares nothing to the dep optimizer when the overlay is not served', () => {
    expect(runConfigHook(makeRoot(), 'serve')).toBeUndefined()
    expect(
      runConfigHook(
        makeRoot({
          section: 'dependencies',
          exports: DEV_TOOLS_LEGACY_EXPORTS,
        }),
        'serve',
      ),
    ).toBeUndefined()
    expect(
      runConfigHook(makeRoot({ section: 'dependencies' }), 'build'),
    ).toBeUndefined()
  })

  it('serves a development dependency', () => {
    const root = makeRoot({ section: 'devDependencies' })

    expect(shouldInjectDevToolsOverlay('serve', root)).toBe(true)
  })

  it('omits a development dependency from production builds', () => {
    const root = makeRoot({ section: 'devDependencies' })

    expect(shouldInjectDevToolsOverlay('build', root)).toBe(false)
  })

  it('injects a regular dependency into production builds', () => {
    const root = makeRoot({ section: 'dependencies' })

    expect(shouldInjectDevToolsOverlay('build', root)).toBe(true)
  })

  it('reads dependency placement from the nearest manifest above the Vite root', () => {
    const root = makeRoot({ section: 'dependencies' })
    const nestedRoot = join(root, 'src', 'client')
    mkdirSync(nestedRoot, { recursive: true })

    expect(shouldInjectDevToolsOverlay('build', nestedRoot)).toBe(true)
  })

  it('omits a package without the Vite integration entry point', () => {
    const root = makeRoot({
      section: 'dependencies',
      exports: DEV_TOOLS_LEGACY_EXPORTS,
    })

    expect(shouldInjectDevToolsOverlay('serve', root)).toBe(false)
    expect(shouldInjectDevToolsOverlay('build', root)).toBe(false)
  })

  it('omits an uninstalled package', () => {
    const root = makeRoot()

    expect(shouldInjectDevToolsOverlay('serve', root)).toBe(false)
    expect(shouldInjectDevToolsOverlay('build', root)).toBe(false)
  })

  it('drives the production HTML transform from dependency placement', async () => {
    const injected = await transformProductionHtml(
      makeRoot({ section: 'dependencies' }),
    )
    const omitted = await transformProductionHtml(
      makeRoot({ section: 'devDependencies' }),
    )

    expect(injected).toEqual([
      expect.objectContaining({
        children: `import '${OVERLAY_MODULE_ID}'`,
        injectTo: 'head-prepend',
      }),
    ])
    expect(omitted).toBeUndefined()
  })
})
