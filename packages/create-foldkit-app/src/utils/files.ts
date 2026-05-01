import {
  Error,
  FileSystem,
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  Path,
} from '@effect/platform'
import {
  Array,
  Effect,
  Match,
  Option,
  Record,
  Ref,
  Schema,
  String,
  pipe,
} from 'effect'
import { ParseError } from 'effect/ParseResult'
import { fileURLToPath } from 'node:url'

const GITHUB_API_BASE_URL =
  'https://api.github.com/repos/foldkit/foldkit/contents/examples'

const getBaseFiles = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const templatesDir = path.resolve(currentDir, '..', '..', 'templates', 'base')

  type FilePath = string
  type FileContent = string
  type FileContentByPath = Record<FilePath, FileContent>

  const fileContentByPath = yield* Ref.make<FileContentByPath>({})

  const processEntry =
    (dir: string) =>
    (entry: string): Effect.Effect<void, Error.PlatformError> =>
      Effect.gen(function* () {
        const fullPath = path.join(dir, entry)
        const stat = yield* fs.stat(fullPath)

        yield* Match.value(stat.type).pipe(
          Match.when('Directory', () => processDirectory(fullPath)),
          Match.when('File', () =>
            Effect.gen(function* () {
              const content = yield* fs.readFileString(fullPath)
              const relativePath = path.relative(templatesDir, fullPath)

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
  ): Effect.Effect<void, Error.PlatformError> =>
    Effect.gen(function* () {
      const entries = yield* fs.readDirectory(dir)
      yield* Effect.forEach(entries, processEntry(dir), {
        concurrency: 'unbounded',
      })
    })

  yield* processDirectory(templatesDir)

  return yield* Ref.get(fileContentByPath)
})

export const createProject = (
  name: string,
  projectPath: string,
  example: string,
) =>
  Effect.gen(function* () {
    yield* createBaseFiles(projectPath)
    yield* modifyBaseFiles(projectPath, name)
    yield* createExampleFiles(projectPath, example)
  })

const createBaseFiles = (projectPath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    yield* fs.makeDirectory(projectPath, { recursive: true })

    const baseFiles = yield* getBaseFiles

    yield* pipe(
      baseFiles,
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

const modifyBaseFiles = (projectPath: string, name: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const packageJsonPath = path.join(projectPath, 'package.json')

    return yield* fs.readFileString(packageJsonPath).pipe(
      Effect.map(String.replace('my-foldkit-app', name)),
      Effect.flatMap(updatedContent =>
        fs.writeFileString(packageJsonPath, updatedContent),
      ),
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
  HttpClientError.HttpClientError | ParseError,
  HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    const fetchFilesRecursively = (
      apiUrl: string,
    ): Effect.Effect<
      ReadonlyArray<GitHubFileEntry>,
      HttpClientError.HttpClientError | ParseError
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
