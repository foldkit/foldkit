import { Match } from 'effect'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { examples } from '../packages/website/src/page/example/meta'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const EXAMPLES_DIR = resolve(REPO_ROOT, 'examples')
const OUTPUT_DIR = resolve(
  REPO_ROOT,
  'packages/website/public/example-apps-embed',
)
const BRIDGE_SCRIPT_PATH = resolve(REPO_ROOT, 'scripts/example-bridge.js')
const BRIDGE_SCRIPT_TAG = '<script src="bridge.js"></script></head>'
const MAX_CONCURRENT_EXAMPLE_BUILDS = 4

// The id the embed's client bundle and prerendered pages agree on. It names one
// build of one example, so it is generated per example rather than shared, and
// FOLDKIT_BUILD_ID overrides it when the deployment already names its builds.
const buildIdForEmbed = (): string => {
  const supplied = process.env['FOLDKIT_BUILD_ID']
  return supplied !== undefined && supplied !== '' ? supplied : randomUUID()
}

const runExampleCommand = (
  exampleDir: string,
  slug: string,
  commandArguments: ReadonlyArray<string>,
  environment: Readonly<Record<string, string>> = {},
): Promise<void> =>
  new Promise((resolvePromise, rejectPromise) => {
    const childProcess = spawn('pnpm', ['exec', ...commandArguments], {
      cwd: exampleDir,
      env: { ...process.env, ...environment },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const writePrefixed = (chunk: Buffer): void => {
      for (const line of chunk.toString().split('\n')) {
        if (line !== '') {
          console.log(`[${slug}] ${line}`)
        }
      }
    }

    childProcess.stdout?.on('data', writePrefixed)
    childProcess.stderr?.on('data', writePrefixed)

    childProcess.once('error', rejectPromise)
    childProcess.once('close', exitCode => {
      if (exitCode === 0) {
        resolvePromise()
      } else {
        rejectPromise(new Error(`Example build failed: ${slug}`))
      }
    })
  })

const collectHtmlPaths = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      return collectHtmlPaths(entryPath)
    }
    return entry.name.endsWith('.html') ? [entryPath] : []
  })

const injectBridgeScript = (outputDir: string): void => {
  copyFileSync(BRIDGE_SCRIPT_PATH, resolve(outputDir, 'bridge.js'))

  for (const htmlPath of collectHtmlPaths(outputDir)) {
    const html = readFileSync(htmlPath, 'utf8')
    writeFileSync(htmlPath, html.replace('</head>', BRIDGE_SCRIPT_TAG))
  }
  console.log('  → injected bridge script')
}

const buildSpaExample = async (
  exampleDir: string,
  slug: string,
  outputDir: string,
): Promise<void> => {
  await runExampleCommand(exampleDir, slug, [
    'vite',
    'build',
    '--base',
    `/example-apps-embed/${slug}/`,
    '--outDir',
    outputDir,
  ])
}

// NOTE: one `vite build` produces the browser bundle, the server bundle and the
// generated pages, so the embed runs the example's own build with its own base
// and copies the finished browser output afterwards. The build id is still
// supplied here: the embed wants one it can reproduce rather than the fresh one
// the example's config generates when the variable is unset.
const buildPrerenderedExample = async (
  exampleDir: string,
  slug: string,
  outputDir: string,
): Promise<void> => {
  rmSync(resolve(exampleDir, 'dist'), { recursive: true, force: true })
  await runExampleCommand(
    exampleDir,
    slug,
    ['vite', 'build', '--base', `/example-apps-embed/${slug}/`],
    { FOLDKIT_BUILD_ID: buildIdForEmbed() },
  )
  cpSync(resolve(exampleDir, 'dist/client'), outputDir, { recursive: true })
}

const buildExample = async (
  slug: string,
  livePreview: 'Spa' | 'Prerendered',
): Promise<void> => {
  console.log(`Building example: ${slug}`)

  const exampleDir = resolve(EXAMPLES_DIR, slug)
  const outputDir = resolve(OUTPUT_DIR, slug)

  await Match.value(livePreview).pipe(
    Match.when('Prerendered', () =>
      buildPrerenderedExample(exampleDir, slug, outputDir),
    ),
    Match.when('Spa', () => buildSpaExample(exampleDir, slug, outputDir)),
    Match.exhaustive,
  )

  injectBridgeScript(outputDir)

  console.log(`  → ${outputDir}`)
}

// The slugs `--only` names, or none for every embedded example. CI uses it to
// run the deployment's own build path over the prerendered examples without
// paying for all of them; the deploy runs the whole set.
const requestedSlugs = (): ReadonlySet<string> => {
  const flagIndex = process.argv.indexOf('--only')
  if (flagIndex === -1) {
    return new Set()
  }
  const value = process.argv[flagIndex + 1] ?? ''
  return new Set(value.split(',').filter(slug => slug !== ''))
}

const main = async (): Promise<void> => {
  const only = requestedSlugs()
  if (only.size === 0 && existsSync(OUTPUT_DIR)) {
    rmSync(OUTPUT_DIR, { recursive: true, force: true })
  }
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const embeddedExamples = examples.filter(
    (
      example,
    ): example is (typeof examples)[number] & {
      livePreview: 'Spa' | 'Prerendered'
    } =>
      example.livePreview !== 'PlaygroundOnly' &&
      (only.size === 0 || only.has(example.slug)),
  )
  const skippedSlugs = examples
    .filter(example => example.livePreview === 'PlaygroundOnly')
    .map(example => example.slug)
  if (skippedSlugs.length > 0) {
    console.log(`Skipping playground-only examples: ${skippedSlugs.join(', ')}`)
  }

  const batchCount = Math.ceil(
    embeddedExamples.length / MAX_CONCURRENT_EXAMPLE_BUILDS,
  )
  const exampleBatches = Array.from({ length: batchCount }, (_, batchIndex) =>
    embeddedExamples.slice(
      batchIndex * MAX_CONCURRENT_EXAMPLE_BUILDS,
      (batchIndex + 1) * MAX_CONCURRENT_EXAMPLE_BUILDS,
    ),
  )

  for (const exampleBatch of exampleBatches) {
    await Promise.all(
      exampleBatch.map(example =>
        buildExample(example.slug, example.livePreview),
      ),
    )
  }

  console.log('')
  console.log(`Built ${embeddedExamples.length} examples into ${OUTPUT_DIR}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
