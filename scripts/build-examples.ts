import { spawn } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { exampleSlugs } from '../packages/website/src/page/example/meta'

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

const runViteBuild = (
  exampleDir: string,
  slug: string,
  outputDir: string,
): Promise<void> =>
  new Promise((resolvePromise, rejectPromise) => {
    const childProcess = spawn(
      'pnpm',
      [
        'exec',
        'vite',
        'build',
        '--base',
        `/example-apps-embed/${slug}/`,
        '--outDir',
        outputDir,
      ],
      { cwd: exampleDir, stdio: 'inherit' },
    )

    childProcess.once('error', rejectPromise)
    childProcess.once('close', exitCode => {
      if (exitCode === 0) {
        resolvePromise()
      } else {
        rejectPromise(new Error(`Example build failed: ${slug}`))
      }
    })
  })

const buildExample = async (slug: string): Promise<void> => {
  console.log(`Building example: ${slug}`)

  const exampleDir = resolve(EXAMPLES_DIR, slug)
  const outputDir = resolve(OUTPUT_DIR, slug)

  await runViteBuild(exampleDir, slug, outputDir)

  copyFileSync(BRIDGE_SCRIPT_PATH, resolve(outputDir, 'bridge.js'))

  const htmlPath = resolve(outputDir, 'index.html')
  if (existsSync(htmlPath)) {
    const html = readFileSync(htmlPath, 'utf8')
    writeFileSync(htmlPath, html.replace('</head>', BRIDGE_SCRIPT_TAG))
    console.log('  → injected bridge script')
  }

  console.log(`  → ${outputDir}`)
}

const main = async (): Promise<void> => {
  if (existsSync(OUTPUT_DIR)) {
    rmSync(OUTPUT_DIR, { recursive: true, force: true })
  }
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const batchCount = Math.ceil(
    exampleSlugs.length / MAX_CONCURRENT_EXAMPLE_BUILDS,
  )
  const exampleBatches = Array.from({ length: batchCount }, (_, batchIndex) =>
    exampleSlugs.slice(
      batchIndex * MAX_CONCURRENT_EXAMPLE_BUILDS,
      (batchIndex + 1) * MAX_CONCURRENT_EXAMPLE_BUILDS,
    ),
  )

  for (const exampleBatch of exampleBatches) {
    await Promise.all(exampleBatch.map(buildExample))
  }

  console.log('')
  console.log(`Built ${exampleSlugs.length} examples into ${OUTPUT_DIR}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
