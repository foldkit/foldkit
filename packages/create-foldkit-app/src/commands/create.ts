import chalk from 'chalk'
import { Console, Effect, FileSystem, Match, Option, Path, pipe } from 'effect'
import { Prompt } from 'effect/unstable/cli'
import { spawnSync } from 'node:child_process'

import { type Example, examples } from '../examples.js'
import { type Rendering, Scaffold, renderings } from '../rendering.js'
import { createProject } from '../utils/files.js'
import {
  type PackageManager,
  devCommand,
  installDependencies,
  readFoldkitSubtreeRef,
} from '../utils/packages.js'
import { validateProjectName } from '../validateName.js'

type CreateInput = Readonly<{
  name: Option.Option<string>
  rendering: Option.Option<Rendering>
  example: Option.Option<Example>
  packageManager: Option.Option<PackageManager>
  maybeDependencyManifestsDirectory: Option.Option<string>
}>

const isWindows = process.platform === 'win32'

const promptForName = Prompt.text({
  message: 'Give your project a name',
  validate: value =>
    Option.match(validateProjectName(value), {
      onNone: () => Effect.succeed(value),
      onSome: message => Effect.fail(message),
    }),
})

const promptForRendering = Prompt.select<Rendering>({
  message: 'Pick a rendering mode',
  choices: renderings.map(({ value, title, description }) => ({
    value,
    title,
    description,
  })),
})

const promptForExample = Prompt.autoComplete({
  message: 'Pick a starting example',
  choices: examples.map(({ value, title, description }) => ({
    value,
    title,
    description,
  })),
})

const promptForPackageManager = Prompt.select<PackageManager>({
  message: 'Pick a package manager',
  choices: [
    { value: 'pnpm', title: 'pnpm' },
    { value: 'npm', title: 'npm' },
    { value: 'yarn', title: 'yarn' },
    { value: 'bun', title: 'bun' },
  ],
})

const resolveScaffold = (
  rendering: Rendering,
  maybeExample: Option.Option<Example>,
) =>
  Match.value(rendering).pipe(
    Match.when('spa', () =>
      pipe(
        maybeExample,
        Option.match({
          onNone: () => promptForExample,
          onSome: Effect.succeed,
        }),
        Effect.map(example => Scaffold.Spa({ example })),
      ),
    ),
    Match.when('ssg', () => Effect.succeed(Scaffold.Ssg())),
    Match.when('ssr', () => Effect.succeed(Scaffold.Ssr())),
    Match.exhaustive,
  )

const resolveInput = (input: CreateInput) =>
  Effect.gen(function* () {
    const name = yield* Option.match(input.name, {
      onNone: () => promptForName,
      onSome: Effect.succeed,
    })
    const rendering = yield* Option.match(input.rendering, {
      onNone: () => promptForRendering,
      onSome: Effect.succeed,
    })
    if (rendering !== 'spa' && Option.isSome(input.example)) {
      yield* Effect.fail('The --example flag only applies to spa rendering.')
    }
    const scaffold = yield* resolveScaffold(rendering, input.example)
    const packageManager = yield* Option.match(input.packageManager, {
      onNone: () => promptForPackageManager,
      onSome: Effect.succeed,
    })
    return { name, scaffold, packageManager }
  })

const validateProject = (
  name: string,
  projectPath: string,
  packageManager: PackageManager,
) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    const exists = yield* fs.exists(projectPath)
    if (exists) {
      return yield* Effect.fail(`Directory ${name} already exists!`)
    }

    const exitCode = yield* Effect.sync(() => {
      const result = spawnSync(
        isWindows ? 'where' : 'which',
        [packageManager],
        { stdio: 'pipe', shell: isWindows },
      )
      return result.status
    })

    if (exitCode !== 0) {
      return yield* Effect.fail(
        `Package manager '${packageManager}' is not available. Please install it first.`,
      )
    }
  })

const setupProject = (
  name: string,
  projectPath: string,
  scaffold: Scaffold,
  packageManager: PackageManager,
) =>
  Effect.gen(function* () {
    yield* Console.log(chalk.blue('🚀 Creating your Foldkit app...'))
    yield* Console.log('')

    yield* createProject(name, projectPath, scaffold, packageManager)

    yield* Console.log(chalk.green(`✅ Created project`))
    yield* Console.log('')
  })

const installProjectDependencies = (
  projectPath: string,
  packageManager: PackageManager,
  scaffold: Scaffold,
  maybeDependencyManifestsDirectory: Option.Option<string>,
) =>
  Effect.gen(function* () {
    yield* Console.log(
      chalk.blue(`📦 Installing dependencies with ${packageManager}...`),
    )

    yield* installDependencies(
      projectPath,
      packageManager,
      scaffold,
      maybeDependencyManifestsDirectory,
    )

    yield* Console.log(chalk.green('✅ Dependencies installed'))
    yield* Console.log('')
  })

const displaySuccessMessage = (
  name: string,
  packageManager: PackageManager,
  subtreeRef: string,
) =>
  Effect.gen(function* () {
    yield* Console.log(chalk.bold('All systems nominal.'))
    yield* Console.log('')
    yield* Console.log(`  > ${chalk.cyan('cd')} ${name}`)
    yield* Console.log(`  > ${chalk.cyan(devCommand(packageManager))}`)
    yield* Console.log('')
    yield* Console.log(chalk.bold('AI-Assisted Development'))
    yield* Console.log('')
    yield* Console.log(
      '  Vendor Foldkit in as a git subtree, pinned to the release this\n' +
        '  project installs, so your AI assistant can reference the matching\n' +
        '  source, examples, and documentation. Commit the scaffold first so\n' +
        '  subtree has a base commit to merge into:',
    )
    yield* Console.log('')
    yield* Console.log(`  > ${chalk.cyan('cd')} ${name}`)
    yield* Console.log(`  > ${chalk.cyan('git init')}`)
    yield* Console.log(`  > ${chalk.cyan('git add .')}`)
    yield* Console.log(
      `  > ${chalk.cyan('git commit -m "chore: initial commit"')}`,
    )
    yield* Console.log(
      `  > ${chalk.cyan(`git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git ${subtreeRef} --squash`)}`,
    )
    yield* Console.log('')
    yield* Console.log(`  Details: ${chalk.cyan('foldkit.dev/ai/overview')}`)
    yield* Console.log('')
    yield* Console.log(`Training manual: ${chalk.cyan('foldkit.dev')}`)
    yield* Console.log(
      `Incident report: ${chalk.cyan('github.com/foldkit/foldkit/issues')}`,
    )
    yield* Console.log('')
    yield* Console.log(`Crew channel: ${chalk.cyan('discord.gg/kav8VNxqGm')}`)
    yield* Console.log('')
    yield* Console.log('Transmissions:')
    yield* Console.log(`  Newsletter:  ${chalk.cyan('foldkit.dev/newsletter')}`)
    yield* Console.log(`  X:           ${chalk.cyan('x.com/devinjameson')}`)
    yield* Console.log(
      `  Bluesky:     ${chalk.cyan('bsky.app/profile/devinjameson.bsky.social')}`,
    )
    yield* Console.log(
      `  Threads:     ${chalk.cyan('threads.com/@devinthedeveloper')}`,
    )
    yield* Console.log('')
    yield* Console.log(
      'Foldkit is a one-astronaut nights-and-weekends project.\n' +
        'If you have praise or criticism, do share.\n' +
        "Please. It's lonely out here.",
    )
    yield* Console.log('')
    yield* Console.log('Love you,')
    yield* Console.log('Mission Control')
    yield* Console.log('')
  })

export const create = (input: CreateInput) =>
  Effect.gen(function* () {
    const { name, scaffold, packageManager } = yield* resolveInput(input)
    const path = yield* Path.Path
    if (
      Option.isSome(input.maybeDependencyManifestsDirectory) &&
      !path.isAbsolute(input.maybeDependencyManifestsDirectory.value)
    ) {
      return yield* Effect.fail(
        'CREATE_FOLDKIT_APP_DEPENDENCY_MANIFESTS_DIRECTORY must be an absolute path.',
      )
    }
    const projectPath = path.resolve(name)

    yield* validateProject(name, projectPath, packageManager)

    const subtreeRef = yield* readFoldkitSubtreeRef

    yield* setupProject(name, projectPath, scaffold, packageManager)
    yield* installProjectDependencies(
      projectPath,
      packageManager,
      scaffold,
      input.maybeDependencyManifestsDirectory,
    )
    yield* displaySuccessMessage(name, packageManager, subtreeRef)

    return name
  })
