import {
  Array,
  Effect,
  FileSystem,
  Match,
  Option,
  Path,
  PlatformError,
  Record,
  String,
  pipe,
} from 'effect'
import { fileURLToPath } from 'node:url'

import { type Scaffold } from '../rendering.js'
import { type TestRunner } from '../testRunner.js'
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
      relativeSegments: ReadonlyArray<string>,
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
              const entrySegments = [...relativeSegments, entry]
              const relativePath = Array.join(entrySegments, '/')
              const stat = yield* fs.stat(fullPath)

              return yield* Match.value(stat.type).pipe(
                Match.withReturnType<
                  Effect.Effect<
                    ReadonlyArray<readonly [string, string]>,
                    PlatformError.PlatformError
                  >
                >(),
                Match.when('Directory', () =>
                  readFiles(fullPath, entrySegments),
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

    return Record.fromEntries(yield* readFiles(templateDir, []))
  })

const getBaseFiles = Effect.gen(function* () {
  const path = yield* Path.Path

  const templateRoot = yield* getTemplateRoot
  return yield* getTemplateFiles(path.join(templateRoot, 'base'))
})

const VITEST_ONLY_FILES = ['vitest.config.ts', 'src/vitest-setup.ts']

const BUN_TEST_MODULE = 'bun:test'
const VITEST_IMPORT = /^import [^']* from 'vitest'\n/m
const IMPORT_STATEMENT = /^import [^']* from '([^']+)'\n/gm
const IMPORT_GROUP_SEPARATOR = '\n\n'

// NOTE: The scaffold's Oxfmt config sorts imports by module within each
// blank-line group, and `bun:test` sorts before the modules that precede
// `vitest`. Replacing the module in place would leave a fresh Bun scaffold
// failing `oxfmt --check`, so the import moves to its sorted position.
const importBunTestInsteadOfVitest = (content: FileContent): FileContent =>
  Option.match(Option.fromNullishOr(VITEST_IMPORT.exec(content)), {
    onNone: () => content,
    onSome: vitestImport => {
      const [vitestStatement] = vitestImport
      const vitestImportStart = vitestImport.index
      const beforeVitestImport = content.slice(0, vitestImportStart)
      const afterVitestImport = content.slice(
        vitestImportStart + vitestStatement.length,
      )
      const bunTestImport = String.replace(
        "from 'vitest'",
        `from '${BUN_TEST_MODULE}'`,
      )(vitestStatement)

      const groupStart = pipe(
        beforeVitestImport,
        String.lastIndexOf(IMPORT_GROUP_SEPARATOR),
        Option.match({
          onNone: () => 0,
          onSome: index => index + IMPORT_GROUP_SEPARATOR.length,
        }),
      )
      const insertionIndex = pipe(
        beforeVitestImport.slice(groupStart).matchAll(IMPORT_STATEMENT),
        Array.fromIterable,
        Array.findFirst(statement =>
          pipe(
            Array.get(statement, 1),
            Option.exists(moduleSpecifier => moduleSpecifier > BUN_TEST_MODULE),
          ),
        ),
        Option.match({
          onNone: () => vitestImportStart,
          onSome: statement => groupStart + statement.index,
        }),
      )

      return importBunTestInsteadOfVitest(
        beforeVitestImport.slice(0, insertionIndex) +
          bunTestImport +
          beforeVitestImport.slice(insertionIndex) +
          afterVitestImport,
      )
    },
  })

const rewriteVitestImports = (
  content: FileContent,
  filePath: FilePath,
): FileContent => {
  if (String.endsWith('.ts')(filePath)) {
    return importBunTestInsteadOfVitest(content)
  } else {
    return content
  }
}

/**
 * Adapt a layer of scaffold files, keyed by project-relative path, to the
 * chosen test runner. The vitest runner keeps the files as they are. The bun
 * runner drops the Vitest config and setup file and points every TypeScript
 * source that imports from `vitest` at `bun:test`.
 */
export const applyTestRunner = (
  files: FileContentByPath,
  testRunner: TestRunner,
): FileContentByPath =>
  Match.value(testRunner).pipe(
    Match.when('vitest', () => files),
    Match.when('bun', () =>
      pipe(
        files,
        Record.filter(
          (_, filePath) => !Array.contains(VITEST_ONLY_FILES, filePath),
        ),
        Record.map(rewriteVitestImports),
      ),
    ),
    Match.exhaustive,
  )

const createFiles = (
  projectPath: string,
  files: FileContentByPath,
  testRunner: TestRunner,
): Effect.Effect<
  void,
  PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    yield* pipe(
      applyTestRunner(files, testRunner),
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

const createBaseFiles = (projectPath: string, testRunner: TestRunner) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    yield* fs.makeDirectory(projectPath, { recursive: true })

    const baseFiles = yield* getBaseFiles
    yield* createFiles(projectPath, baseFiles, testRunner)
  })

const createOptionalTemplateFiles = (
  projectPath: string,
  testRunner: TestRunner,
  ...templateSegments: ReadonlyArray<string>
) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const templateRoot = yield* getTemplateRoot
    const templateDir = path.join(templateRoot, ...templateSegments)
    const isTemplateDirectoryPresent = yield* fs.exists(templateDir)

    if (isTemplateDirectoryPresent) {
      const files = yield* getTemplateFiles(templateDir)
      yield* createFiles(projectPath, files, testRunner)
    }
  })

type OverlayDirectory = 'ssg' | 'ssr'

const overlayRenderingFiles = (
  projectPath: string,
  directory: OverlayDirectory,
  testRunner: TestRunner,
) =>
  Effect.gen(function* () {
    const path = yield* Path.Path

    const templateRoot = yield* getTemplateRoot
    const renderingFiles = yield* getTemplateFiles(
      path.join(templateRoot, 'rendering', directory),
    )

    yield* createFiles(projectPath, renderingFiles, testRunner)
  })

const createRenderingFiles = (
  projectPath: string,
  scaffold: Scaffold,
  testRunner: TestRunner,
) =>
  Match.value(scaffold).pipe(
    Match.tagsExhaustive({
      Spa: () => Effect.void,
      Ssg: () => overlayRenderingFiles(projectPath, 'ssg', testRunner),
      Ssr: () => overlayRenderingFiles(projectPath, 'ssr', testRunner),
    }),
  )

export const createProject = (
  name: string,
  projectPath: string,
  scaffold: Scaffold,
  packageManager: PackageManager,
  testRunner: TestRunner,
) =>
  Effect.gen(function* () {
    yield* createBaseFiles(projectPath, testRunner)
    yield* createRenderingFiles(projectPath, scaffold, testRunner)
    yield* modifyBaseFiles(projectPath, name, packageManager)
    yield* createOptionalTemplateFiles(
      projectPath,
      testRunner,
      'package-managers',
      packageManager,
    )
    yield* createOptionalTemplateFiles(
      projectPath,
      testRunner,
      'test-runners',
      testRunner,
    )
    yield* Match.value(scaffold).pipe(
      Match.tagsExhaustive({
        Spa: ({ example }) =>
          createExampleFiles(projectPath, example, testRunner),
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

const createExampleFiles = (
  projectPath: string,
  example: string,
  testRunner: TestRunner,
) =>
  Effect.gen(function* () {
    const path = yield* Path.Path

    const templateRoot = yield* getTemplateRoot
    const files = yield* getTemplateFiles(
      path.join(templateRoot, 'examples', example, 'src'),
    )

    yield* createFiles(
      projectPath,
      Record.mapKeys(files, filePath => `src/${filePath}`),
      testRunner,
    )
  })
