import {
  Array,
  Effect,
  FileSystem,
  Match,
  Path,
  PlatformError,
  Record,
  String,
  pipe,
} from 'effect'
import { fileURLToPath } from 'node:url'

import { type Scaffold } from '../rendering.js'
import {
  type PackageManager,
  devCommand,
  installCommand,
  runScriptCommand,
} from './packages.js'

type FilePath = string
type FileContent = string
type FileContentByPath = Record<FilePath, FileContent>

const getTemplateRoot = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const bundledRoot = path.resolve(currentDir, '..', 'templates')

  if (yield* fs.exists(bundledRoot)) {
    return bundledRoot
  } else {
    return path.resolve(currentDir, '..', '..', 'templates')
  }
})

const getTemplateFiles = (templateDir: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const readFiles = (
      dir: string,
      relativeDir: string,
    ): Effect.Effect<
      ReadonlyArray<readonly [string, string]>,
      PlatformError.PlatformError
    > =>
      Effect.gen(function* () {
        const entries = yield* fs.readDirectory(dir)
        const nested = yield* Effect.forEach(
          entries,
          entry =>
            Effect.gen(function* () {
              const fullPath = path.join(dir, entry)
              const relativePath = path.join(relativeDir, entry)
              const stat = yield* fs.stat(fullPath)

              return yield* Match.value(stat.type).pipe(
                Match.withReturnType<
                  Effect.Effect<
                    ReadonlyArray<readonly [string, string]>,
                    PlatformError.PlatformError
                  >
                >(),
                Match.when('Directory', () =>
                  readFiles(fullPath, relativePath),
                ),
                Match.when('File', () =>
                  Effect.map(fs.readFileString(fullPath), content => [
                    [relativePath, content],
                  ]),
                ),
                Match.orElse(() => Effect.succeed([])),
              )
            }),
          { concurrency: 'unbounded' },
        )

        return Array.flatten(nested)
      })

    return Record.fromEntries(yield* readFiles(templateDir, ''))
  })

const getBaseFiles = Effect.gen(function* () {
  const path = yield* Path.Path

  const templateRoot = yield* getTemplateRoot
  return yield* getTemplateFiles(path.join(templateRoot, 'base'))
})

const getPackageManagerFiles = (packageManager: PackageManager) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const templateRoot = yield* getTemplateRoot
    const templateDir = path.join(
      templateRoot,
      'package-managers',
      packageManager,
    )
    const isTemplateDirectoryPresent = yield* fs.exists(templateDir)

    if (isTemplateDirectoryPresent) {
      return yield* getTemplateFiles(templateDir)
    } else {
      return {}
    }
  })

const createFiles = (
  projectPath: string,
  files: FileContentByPath,
): Effect.Effect<
  void,
  PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    yield* pipe(
      files,
      Record.toEntries,
      Effect.forEach(
        ([filePath, content]) =>
          Effect.gen(function* () {
            const targetPath = Match.value(filePath).pipe(
              Match.when('gitignore', () => '.gitignore'),
              Match.when('ignore', () => '.ignore'),
              Match.orElse(() => filePath),
            )
            const fullPath = path.join(projectPath, targetPath)
            const dirPath = path.dirname(fullPath)

            yield* fs.makeDirectory(dirPath, { recursive: true })
            yield* fs.writeFileString(fullPath, content)
          }),
        { concurrency: 'unbounded' },
      ),
    )
  })

const createBaseFiles = (projectPath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    yield* fs.makeDirectory(projectPath, { recursive: true })

    const baseFiles = yield* getBaseFiles
    yield* createFiles(projectPath, baseFiles)
  })

const createPackageManagerFiles = (
  projectPath: string,
  packageManager: PackageManager,
) =>
  Effect.gen(function* () {
    const packageManagerFiles = yield* getPackageManagerFiles(packageManager)
    yield* createFiles(projectPath, packageManagerFiles)
  })

type OverlayDirectory = 'ssg' | 'ssr'

const overlayRenderingFiles = (
  projectPath: string,
  directory: OverlayDirectory,
) =>
  Effect.gen(function* () {
    const path = yield* Path.Path

    const templateRoot = yield* getTemplateRoot
    const renderingFiles = yield* getTemplateFiles(
      path.join(templateRoot, 'rendering', directory),
    )

    yield* createFiles(projectPath, renderingFiles)
  })

const createRenderingFiles = (projectPath: string, scaffold: Scaffold) =>
  Match.value(scaffold).pipe(
    Match.tagsExhaustive({
      Spa: () => Effect.void,
      Ssg: () => overlayRenderingFiles(projectPath, 'ssg'),
      Ssr: () => overlayRenderingFiles(projectPath, 'ssr'),
    }),
  )

export const createProject = (
  name: string,
  projectPath: string,
  scaffold: Scaffold,
  packageManager: PackageManager,
) =>
  Effect.gen(function* () {
    yield* createBaseFiles(projectPath)
    yield* createRenderingFiles(projectPath, scaffold)
    yield* modifyBaseFiles(projectPath, name, packageManager)
    yield* createPackageManagerFiles(projectPath, packageManager)
    yield* Match.value(scaffold).pipe(
      Match.tagsExhaustive({
        Spa: ({ example }) => createExampleFiles(projectPath, example),
        Ssg: () => Effect.void,
        Ssr: () => Effect.void,
      }),
    )
  })

export const applyPackageManager = (
  readme: string,
  packageManager: PackageManager,
): string =>
  pipe(
    readme,
    String.replaceAll('{{installCommand}}', installCommand(packageManager)),
    String.replaceAll('{{devCommand}}', devCommand(packageManager)),
    String.replaceAll(
      '{{buildCommand}}',
      runScriptCommand(packageManager, 'build'),
    ),
    String.replaceAll(
      '{{previewCommand}}',
      runScriptCommand(packageManager, 'preview'),
    ),
    String.replaceAll(
      '{{startCommand}}',
      runScriptCommand(packageManager, 'start'),
    ),
  )

const modifyBaseFiles = (
  projectPath: string,
  name: string,
  packageManager: PackageManager,
) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const packageJsonPath = path.join(projectPath, 'package.json')
    const packageJson = yield* fs.readFileString(packageJsonPath)
    yield* fs.writeFileString(
      packageJsonPath,
      String.replace('{{name}}', name)(packageJson),
    )

    const readmePath = path.join(projectPath, 'README.md')
    const readme = yield* fs.readFileString(readmePath)
    yield* fs.writeFileString(
      readmePath,
      applyPackageManager(readme, packageManager),
    )
  })

const createExampleFiles = (projectPath: string, example: string) =>
  Effect.gen(function* () {
    const path = yield* Path.Path

    const templateRoot = yield* getTemplateRoot
    const files = yield* getTemplateFiles(
      path.join(templateRoot, 'examples', example, 'src'),
    )

    yield* createFiles(path.join(projectPath, 'src'), files)
  })
