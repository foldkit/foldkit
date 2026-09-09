import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

import {
  loadPlaygroundFiles,
  loadPlaygroundWorkspacePackageVersions,
} from '../packages/website/scripts/playgroundFilesPlugin'

class PlaygroundSsgBuildError extends Error {}

const log = (message: string): void => {
  console.log(`[playground-ssg-build] ${message}`)
}

const fail = (message: string): never => {
  throw new PlaygroundSsgBuildError(message)
}

const runRequired = (
  label: string,
  command: string,
  args: ReadonlyArray<string>,
  cwd: string,
): void => {
  log(label)
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    return fail(`${command} ${args.join(' ')} exited ${String(result.status)}`)
  }
}

const writeProjectFiles = (
  projectDir: string,
  files: Readonly<Record<string, string>>,
): void => {
  for (const [path, contents] of Object.entries(files)) {
    const target = resolve(projectDir, path)
    const projectRelativePath = relative(projectDir, target)
    if (
      projectRelativePath === '..' ||
      projectRelativePath.startsWith(`..${sep}`) ||
      isAbsolute(projectRelativePath)
    ) {
      return fail(`the transformed playground contains an unsafe path: ${path}`)
    }
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, contents)
  }
}

const packageVersions = (projectDir: string): string => {
  const parsed: unknown = JSON.parse(
    readFileSync(join(projectDir, 'package.json'), 'utf8'),
  )
  if (typeof parsed !== 'object' || parsed === null) {
    return fail('the transformed SSG package.json is not an object')
  }
  const dependencies =
    'dependencies' in parsed &&
    typeof parsed.dependencies === 'object' &&
    parsed.dependencies !== null
      ? parsed.dependencies
      : {}
  const devDependencies =
    'devDependencies' in parsed &&
    typeof parsed.devDependencies === 'object' &&
    parsed.devDependencies !== null
      ? parsed.devDependencies
      : {}
  const foldkit = Reflect.get(dependencies, 'foldkit')
  const plugin = Reflect.get(devDependencies, '@foldkit/vite-plugin')
  if (typeof foldkit !== 'string' || typeof plugin !== 'string') {
    return fail(
      'the transformed SSG manifest must retain foldkit and @foldkit/vite-plugin',
    )
  }
  return `foldkit@${foldkit}, @foldkit/vite-plugin@${plugin}`
}

const assertExactWorkspaceVersions = (
  bySlug: Readonly<
    Record<string, Readonly<{ files: Readonly<Record<string, string>> }>>
  >,
  versions: Readonly<Record<string, string>>,
): void => {
  for (const [slug, { files }] of Object.entries(bySlug)) {
    const manifestSource = files['package.json']
    if (manifestSource === undefined) {
      return fail(`the ${slug} playground omits package.json`)
    }
    const manifest: Readonly<{
      dependencies?: Readonly<Record<string, string>>
      devDependencies?: Readonly<Record<string, string>>
    }> = JSON.parse(manifestSource)
    const dependencies = {
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {}),
    }
    for (const [name, version] of Object.entries(versions)) {
      const specifier = dependencies[name]
      if (specifier !== undefined && specifier !== version) {
        return fail(
          `${slug} pins ${name} as ${specifier}, not the exact workspace version ${version}`,
        )
      }
    }
  }
}

const main = async (): Promise<void> => {
  const bySlug = await loadPlaygroundFiles()
  assertExactWorkspaceVersions(
    bySlug,
    await loadPlaygroundWorkspacePackageVersions(),
  )
  const ssgEntry = Object.entries(bySlug).find(([slug]) => slug === 'ssg')
  if (ssgEntry === undefined) {
    return fail('the website generated no SSG playground')
  }
  const [, { files }] = ssgEntry
  const projectDir = mkdtempSync(join(tmpdir(), 'foldkit-playground-ssg-'))

  try {
    writeProjectFiles(projectDir, files)
    log(
      `Installing the exact transformed manifest (${packageVersions(projectDir)})`,
    )
    runRequired(
      'Installing with npm without legacy peer handling',
      'npm',
      [
        'install',
        '--no-audit',
        '--no-fund',
        '--cache',
        join(projectDir, '.npm-cache'),
      ],
      projectDir,
    )
    runRequired(
      'Running the transformed project build command',
      'npm',
      ['run', 'build'],
      projectDir,
    )
    log('PASS')
  } finally {
    rmSync(projectDir, { recursive: true, force: true })
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[playground-ssg-build] FAIL ${message}`)
  process.exitCode = 1
})
