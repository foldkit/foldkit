import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const REPO_DIR = resolve(import.meta.dirname, '..')
const EXAMPLE_DIR = resolve(REPO_DIR, 'examples/ssg')
const CLIENT_DIR = resolve(EXAMPLE_DIR, 'dist/client')
const DIST_DIR = resolve(EXAMPLE_DIR, 'dist')
const CACHE_DIR = resolve(EXAMPLE_DIR, 'node_modules/.cache')
const INDEX_PATH = resolve(CLIENT_DIR, 'index.html')
const BUILD_ID = 'prerender-repeatable-gate'
const HYDRATION_STAMP_PATTERN = /\sdata-foldkit-[a-z-]+="[^"]*"/g
const HYDRATION_STAMP_PREFIX = 'data-foldkit-'

class PrerenderRepeatableError extends Error {}

const log = (message: string): void => {
  console.log(`[prerender-repeatable] ${message}`)
}

const fail = (message: string): never => {
  throw new PrerenderRepeatableError(message)
}

const runRequired = (
  label: string,
  command: string,
  args: ReadonlyArray<string>,
): void => {
  log(label)
  const result = spawnSync(command, args, {
    cwd: EXAMPLE_DIR,
    stdio: 'inherit',
    env: { ...process.env, FOLDKIT_BUILD_ID: BUILD_ID },
  })

  if (result.error !== undefined) {
    return fail(`${command} ${args.join(' ')} failed: ${result.error.message}`)
  }
  if (result.status !== 0) {
    return fail(`${command} ${args.join(' ')} exited ${String(result.status)}`)
  }
}

// One `vite build` owns the browser build, the server build and the pages, so
// repeating the build is what repeating the generation means now. There is no
// step that generates over output another command left behind.
const build = (label: string): void => {
  runRequired(label, 'pnpm', ['exec', 'vite', 'build'])
}

// NOTE: the build is byte-identical between runs because the build id is
// pinned, so output left by an earlier invocation is indistinguishable from
// what this run writes. Both directories go so the first build starts from
// nothing.
const clearPriorState = (): void => {
  rmSync(DIST_DIR, { recursive: true, force: true })
  rmSync(CACHE_DIR, { recursive: true, force: true })
}

const readClientFiles = (): Readonly<Record<string, Buffer>> => {
  const entries = readdirSync(CLIENT_DIR, {
    recursive: true,
    withFileTypes: true,
  })
  const files: Record<string, Buffer> = {}

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }

    const filePath = join(entry.parentPath, entry.name)
    files[relative(CLIENT_DIR, filePath)] = readFileSync(filePath)
  }

  return files
}

// The generated `/` replaces the template the browser build emits, so an
// `index.html` still holding a placeholder means nothing was generated and the
// comparisons below would be comparing untouched output with itself.
const assertGenerated = (): void => {
  const index = readFileSync(INDEX_PATH, 'utf8')
  if (!index.includes(HYDRATION_STAMP_PREFIX)) {
    return fail(
      `"${INDEX_PATH}" carries no ${HYDRATION_STAMP_PREFIX} attribute, so the build generated no page over the template`,
    )
  }
}

const assertSameFiles = (
  label: string,
  before: Readonly<Record<string, Buffer>>,
  after: Readonly<Record<string, Buffer>>,
): void => {
  const paths = [...new Set([...Object.keys(before), ...Object.keys(after)])]

  for (const path of paths.sort()) {
    const first = before[path]
    const second = after[path]

    if (first === undefined) {
      return fail(`${label}: "${path}" appeared only after the re-run`)
    }
    if (second === undefined) {
      return fail(`${label}: "${path}" stopped being written by the re-run`)
    }
    if (!first.equals(second)) {
      return fail(`${label}: "${path}" differs between runs`)
    }
  }

  log(`${label}: ${String(paths.length)} build files match`)
}

// A static render carries none of the hydration stamps, so a guard reading any
// of them mistakes a generated page for a template. Stripping every
// `data-foldkit-` attribute rather than a named list models that render without
// a second build and keeps covering a stamp the renderer adds later.
const stripHydrationStamps = (): void => {
  const generated = readFileSync(INDEX_PATH, 'utf8')
  const stripped = generated.replaceAll(HYDRATION_STAMP_PATTERN, '')

  if (stripped === generated) {
    return fail(
      `"${INDEX_PATH}" carries no ${HYDRATION_STAMP_PREFIX} attribute to strip, so this step no longer models a static render`,
    )
  }

  if (stripped.includes(HYDRATION_STAMP_PREFIX)) {
    return fail(
      `a ${HYDRATION_STAMP_PREFIX} attribute survived stripping in "${INDEX_PATH}", so this step no longer models a static render`,
    )
  }

  writeFileSync(INDEX_PATH, stripped, 'utf8')
}

const main = (): void => {
  clearPriorState()

  build('Building the project')
  const firstRun = readClientFiles()
  assertGenerated()

  build('Building again over the first build')
  assertSameFiles(
    're-build over one output directory',
    firstRun,
    readClientFiles(),
  )

  // A generated page carries hydration stamps and a template does not, so
  // leaving one in place models a build finding output it wrote itself, which
  // is what a template read off disk would then parse.
  stripHydrationStamps()
  build('Building again over stripped output')
  assertSameFiles('re-build over static output', firstRun, readClientFiles())

  log('PASS')
}

try {
  main()
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[prerender-repeatable] FAIL ${message}`)
  process.exitCode = 1
}
