import {
  Array,
  Effect,
  FileSystem,
  Match,
  Option,
  Path,
  PlatformError,
  Record,
  Ref,
  Schema,
  String,
  pipe,
} from 'effect'
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
} from 'effect/unstable/http'
import { fileURLToPath } from 'node:url'

import { type PackageManager, devCommand, installCommand } from './packages.js'

const GITHUB_API_BASE_URL =
  'https://api.github.com/repos/foldkit/foldkit/contents/examples'

type FilePath = string
type FileContent = string
type FileContentByPath = Record<FilePath, FileContent>

const getTemplateRoot = Effect.gen(function* () {
  const path = yield* Path.Path

  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(currentDir, '..', '..', 'templates')
})

const getTemplateFiles = (templateDir: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const fileContentByPath = yield* Ref.make<FileContentByPath>({})

    const processEntry =
      (dir: string) =>
      (entry: string): Effect.Effect<void, PlatformError.PlatformError> =>
        Effect.gen(function* () {
          const fullPath = path.join(dir, entry)
          const stat = yield* fs.stat(fullPath)

          yield* Match.value(stat.type).pipe(
            Match.when('Directory', () => processDirectory(fullPath)),
            Match.when('File', () =>
              Effect.gen(function* () {
                const content = yield* fs.readFileString(fullPath)
                const relativePath = path.relative(templateDir, fullPath)

                yield* Ref.update(fileContentByPath, files => ({
                  ...files,
                  [relativePath]: content,
                }))
              }),
            ),
            Match.orElse(() => Effect.void),
          )
        })

    const processDirectory = (
      dir: string,
    ): Effect.Effect<void, PlatformError.PlatformError> =>
      Effect.gen(function* () {
        const entries = yield* fs.readDirectory(dir)
        yield* Effect.forEach(entries, processEntry(dir), {
          concurrency: 'unbounded',
        })
      })

    yield* processDirectory(templateDir)

    return yield* Ref.get(fileContentByPath)
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

export const createProject = (
  name: string,
  projectPath: string,
  example: string,
  packageManager: PackageManager,
) =>
  Effect.gen(function* () {
    yield* createBaseFiles(projectPath)
    yield* modifyBaseFiles(projectPath, name, packageManager)
    yield* createPackageManagerFiles(projectPath, packageManager)
    yield* createExampleFiles(projectPath, example)
  })

export const applyPackageManager = (
  readme: string,
  packageManager: PackageManager,
): string =>
  pipe(
    readme,
    String.replace('{{installCommand}}', installCommand(packageManager)),
    String.replace('{{devCommand}}', devCommand(packageManager)),
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

const GitHubFileEntry = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
  download_url: Schema.NullOr(Schema.String),
  type: Schema.String,
  url: Schema.String,
})

type GitHubFileEntry = typeof GitHubFileEntry.Type

const createExampleFiles = (projectPath: string, example: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const files = yield* fetchExampleFileList(example)
    const srcPath = path.join(projectPath, 'src')
    yield* fs.makeDirectory(srcPath, { recursive: true })

    yield* Effect.forEach(
      files,
      file => downloadExampleFile(file, projectPath),
      {
        concurrency: 'unbounded',
      },
    )
  })

const fetchExampleFileList = (
  example: string,
): Effect.Effect<
  ReadonlyArray<GitHubFileEntry>,
  HttpClientError.HttpClientError | Schema.SchemaError,
  HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    const fetchFilesRecursively = (
      apiUrl: string,
    ): Effect.Effect<
      ReadonlyArray<GitHubFileEntry>,
      HttpClientError.HttpClientError | Schema.SchemaError
    > =>
      Effect.gen(function* () {
        const request = HttpClientRequest.get(apiUrl)
        const response = yield* client.execute(request)
        const json = yield* response.json
        const entries = yield* Schema.decodeUnknownEffect(
          Schema.Array(GitHubFileEntry),
        )(json)

        const results = yield* Effect.forEach(entries, entry =>
          Match.value(entry.type).pipe(
            Match.when('file', () => Effect.succeed([entry])),
            Match.when('dir', () => fetchFilesRecursively(entry.url)),
            Match.orElse(() => Effect.succeed([])),
          ),
        )

        return Array.flatten(results)
      })

    const githubApiUrl = `${GITHUB_API_BASE_URL}/${example}/src`
    return yield* fetchFilesRecursively(githubApiUrl)
  })

const downloadExampleFile = (file: GitHubFileEntry, projectPath: string) =>
  Effect.gen(function* () {
    if (!file.download_url) {
      return yield* Effect.fail(`File ${file.name} has no download URL`)
    }

    const client = yield* HttpClient.HttpClient
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const request = HttpClientRequest.get(file.download_url)
    const response = yield* client.execute(request)
    const content = yield* response.text

    const pathParts = String.split(file.path, '/')
    const srcIndex = Array.findFirstIndex(pathParts, part => part === 'src')
    const relativePath = pipe(
      srcIndex,
      Option.match({
        onNone: () => file.name,
        onSome: index =>
          pipe(pathParts, Array.drop(index + 1), Array.join('/')),
      }),
    )
    const targetPath = path.join(projectPath, 'src', relativePath)

    const dirPath = path.dirname(targetPath)
    yield* fs.makeDirectory(dirPath, { recursive: true })

    yield* fs.writeFileString(targetPath, content)
  })
