import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PACKAGE_DIR = 'packages/create-foldkit-app'

const log = (message: string): void => {
  console.log(`[smoke] ${message}`)
}

const die = (message: string): never => {
  console.error(`[smoke] FAIL: ${message}`)
  process.exit(1)
}

const run = (
  command: string,
  args: ReadonlyArray<string>,
  options: { cwd?: string; inherit?: boolean } = {},
): { stdout: string; stderr: string; status: number | null } => {
  const result = spawnSync(command, [...args], {
    cwd: options.cwd,
    encoding: 'utf-8',
    stdio: options.inherit ? 'inherit' : 'pipe',
    timeout: 60_000,
  })
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  }
}

const findEffectInstalls = (root: string): ReadonlyArray<string> => {
  const found: Array<string> = []
  const walk = (dir: string): void => {
    let entries: ReadonlyArray<string>
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry)
      let entryStat
      try {
        entryStat = statSync(full)
      } catch {
        continue
      }
      if (!entryStat.isDirectory()) continue

      const pkgJsonPath = join(full, 'package.json')
      try {
        if (statSync(pkgJsonPath).isFile()) {
          const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
          if (pkg.name === 'effect') {
            found.push(`${full} (${pkg.version})`)
          }
        }
      } catch {
        // ignore missing package.json
      }

      walk(full)
    }
  }
  walk(root)
  return found
}

log('Building create-foldkit-app...')
const buildResult = run('pnpm', ['--filter', 'create-foldkit-app', 'build'], {
  inherit: true,
})
if (buildResult.status !== 0) {
  die('build failed')
}

log('Packing tarball...')
const packResult = run('npm', ['pack', '--json'], { cwd: PACKAGE_DIR })
if (packResult.status !== 0) {
  die(`npm pack failed:\n${packResult.stderr}`)
}
const packInfo = JSON.parse(packResult.stdout)
const tarballFilename: string = packInfo[0].filename
const tarballPath = join(process.cwd(), PACKAGE_DIR, tarballFilename)
log(`Created ${tarballFilename}`)

const tempDir = mkdtempSync(join(tmpdir(), 'create-foldkit-smoke-'))
log(`Temp dir: ${tempDir}`)

try {
  const initResult = run('npm', ['init', '-y'], { cwd: tempDir })
  if (initResult.status !== 0) {
    die(`npm init failed:\n${initResult.stderr}`)
  }

  log('Installing tarball via npm (reproduces hoisting behavior)...')
  const installResult = run(
    'npm',
    ['install', tarballPath, '--no-audit', '--no-fund'],
    { cwd: tempDir, inherit: true },
  )
  if (installResult.status !== 0) {
    die('npm install of tarball failed')
  }

  log('Checking for duplicate effect installs...')
  const effectInstalls = findEffectInstalls(join(tempDir, 'node_modules'))
  if (effectInstalls.length !== 1) {
    die(
      `Expected exactly 1 effect install, found ${effectInstalls.length}:\n${effectInstalls.join('\n')}\n\n` +
        'This indicates a transitive dependency drift that will cross-link incompatible Effect runtimes.',
    )
  }
  log(`Single effect install: ${effectInstalls[0]}`)

  log('Running CLI to exercise the Effect runtime initialization...')
  const cliResult = spawnSync(
    'node',
    [join(tempDir, 'node_modules/.bin/create-foldkit-app')],
    {
      encoding: 'utf-8',
      input: '',
      timeout: 3_000,
    },
  )
  const combinedOutput = `${cliResult.stdout ?? ''}${cliResult.stderr ?? ''}`

  if (combinedOutput.includes('asEffect')) {
    die(
      `Effect runtime crashed at startup. This usually means duplicate effect installs with mismatched internal protocols.\n\noutput:\n${combinedOutput}`,
    )
  }
  log('CLI initialized without runtime crash')
} finally {
  log('Cleaning up...')
  rmSync(tempDir, { recursive: true, force: true })
  rmSync(tarballPath, { force: true })
}

log('PASS')
