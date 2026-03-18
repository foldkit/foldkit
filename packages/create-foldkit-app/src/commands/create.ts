import { Command, FileSystem, Path } from '@effect/platform'
import chalk from 'chalk'
import { Console, Effect, Match } from 'effect'

import { createProject } from '../utils/files.js'
import { installDependencies } from '../utils/packages.js'

type PackageManager = 'pnpm' | 'npm' | 'yarn'
type Example =
  | 'counter'
  | 'form'
  | 'query-sync'
  | 'routing'
  | 'shopping-cart'
  | 'snake'
  | 'stopwatch'
  | 'todo'
  | 'weather'
  | 'websocket-chat'
  | 'auth'
  | 'ui-showcase'

type CreateOptions = {
  name: string
  example: Example
  packageManager: PackageManager
}

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

    const checkCommand = Command.make('which', packageManager).pipe(
      Command.stdout('pipe'),
      Command.stderr('pipe'),
    )

    return yield* Command.exitCode(checkCommand).pipe(
      Effect.filterOrFail(
        exitCode => exitCode === 0,
        () =>
          `Package manager '${packageManager}' is not available. Please install it first.`,
      ),
    )
  })

const setupProject = (name: string, projectPath: string, example: Example) =>
  Effect.gen(function* () {
    yield* Console.log(chalk.blue('🚀 Creating your Foldkit app...'))
    yield* Console.log('')

    yield* createProject(name, projectPath, example)

    yield* Console.log(chalk.green(`✅ Created project`))
    yield* Console.log('')
  })

const installProjectDependencies = (
  projectPath: string,
  packageManager: PackageManager,
  example: Example,
) =>
  Effect.gen(function* () {
    yield* Console.log(
      chalk.blue(`📦 Installing dependencies with ${packageManager}...`),
    )

    yield* installDependencies(projectPath, packageManager, example)

    yield* Console.log(chalk.green('✅ Dependencies installed'))
    yield* Console.log('')
  })

const runDevServerCommand = (packageManager: PackageManager) =>
  Match.value(packageManager).pipe(
    Match.when('pnpm', () => 'pnpm dev'),
    Match.when('npm', () => 'npm run dev'),
    Match.when('yarn', () => 'yarn dev'),
    Match.exhaustive,
  )

const displaySuccessMessage = (name: string, packageManager: PackageManager) =>
  Effect.gen(function* () {
    yield* Console.log(chalk.bold('All systems nominal.'))
    yield* Console.log('')
    yield* Console.log(`  > ${chalk.cyan('cd')} ${name}`)
    yield* Console.log(`  > ${chalk.cyan(runDevServerCommand(packageManager))}`)
    yield* Console.log('')
    yield* Console.log(chalk.bold('AI-Assisted Development'))
    yield* Console.log('')
    yield* Console.log(
      '  Clone Foldkit as a submodule so your AI assistant can\n' +
        '  reference the source, examples, and documentation:',
    )
    yield* Console.log('')
    yield* Console.log(`  > ${chalk.cyan('cd')} ${name}`)
    yield* Console.log(`  > ${chalk.cyan('git init')}`)
    yield* Console.log(
      `  > ${chalk.cyan('git submodule add https://github.com/foldkit/foldkit.git repos/foldkit')}`,
    )
    yield* Console.log('')
    yield* Console.log(`  Details: ${chalk.cyan('foldkit.dev/ai/overview')}`)
    yield* Console.log('')
    yield* Console.log(
      'Foldkit is a one-astronaut nights-and-weekends project.\n' +
        'If you have praise or criticism, do share.\n' +
        "Please. It's lonely out here.\n\n" +
        'Be careful. Make good decisions.',
    )
    yield* Console.log('')
    yield* Console.log(`Training manual: ${chalk.cyan('foldkit.dev')}`)
    yield* Console.log(
      `Incident report: ${chalk.cyan('github.com/foldkit/foldkit/issues')}`,
    )
    yield* Console.log('')
    yield* Console.log(
      `Transmissions:   ${chalk.cyan('foldkit.dev/newsletter')}`,
    )
    yield* Console.log(
      `Discord:         ${chalk.cyan('discord.gg/U3ZuyGjJ')}`,
    )
    yield* Console.log(`X:               ${chalk.cyan('x.com/devinjameson')}`)
    yield* Console.log(
      `Bluesky:         ${chalk.cyan('bsky.app/profile/devinjameson.bsky.social')}`,
    )
    yield* Console.log(
      `Threads:         ${chalk.cyan('threads.com/@devinthedeveloper')}`,
    )
    yield* Console.log('')
    yield* Console.log('Love you,')
    yield* Console.log('Mission Control')
    yield* Console.log('')
  })

export const create = ({ name, example, packageManager }: CreateOptions) =>
  Effect.gen(function* () {
    const path = yield* Path.Path
    const projectPath = path.resolve(name)

    yield* validateProject(name, projectPath, packageManager)
    yield* setupProject(name, projectPath, example)
    yield* installProjectDependencies(projectPath, packageManager, example)
    yield* displaySuccessMessage(name, packageManager)

    return name
  })
