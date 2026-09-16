import {
  Deferred,
  type Duration,
  Effect,
  Fiber,
  FiberMap,
  Ref,
  Result,
  Stream,
  String,
  pipe,
} from 'effect'

import type {
  FileSystemTree,
  WebContainer,
  WebContainerProcess,
} from '@webcontainer/api'

const LOAD_API_TIMEOUT = '90 seconds'
const BOOT_TIMEOUT = '90 seconds'
const MOUNT_TIMEOUT = '90 seconds'
const SPAWN_TIMEOUT = '90 seconds'
const INSTALL_TIMEOUT = '5 minutes'
const DEV_SERVER_TIMEOUT = '3 minutes'
const PROCESS_OUTPUT_DRAIN_TIMEOUT = '1 second'

export const PROCESS_OUTPUT_TAIL_CHARACTERS = 32_768

type PlaygroundProcess = Pick<WebContainerProcess, 'exit' | 'kill' | 'output'>

type ProcessHost = Readonly<{
  spawn: (command: string, args: Array<string>) => Promise<WebContainerProcess>
}>

type ServerHost = ProcessHost &
  Readonly<{
    on: (
      event: 'server-ready',
      listener: (port: number, url: string) => void,
    ) => () => void
  }>

type CapturedProcessOutput = Readonly<{
  tail: Ref.Ref<string>
  fiber: Fiber.Fiber<void, Error>
}>

export type PlaygroundWebContainer = Readonly<{
  container: WebContainer
  previewUrl: string
  pendingWrites: FiberMap.FiberMap<string, void, never>
  serverFailure: Deferred.Deferred<never, Error>
}>

export const reasonFromError = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.cause instanceof Error) {
      const separator = error.message.endsWith('.') ? ' ' : ': '
      return `${error.message}${separator}${error.cause.message}`
    }
    return error.message
  }
  return globalThis.String(error)
}

export const appendProcessOutputTail = (
  current: string,
  chunk: string,
): string =>
  pipe(
    current,
    String.concat(chunk),
    String.takeRight(PROCESS_OUTPUT_TAIL_CHARACTERS),
  )

const errorWithOutput = (message: string, output: string): Error =>
  String.isEmpty(output)
    ? new Error(message)
    : new Error(`${message}\n${output}`)

const failWithOutput = (tail: Ref.Ref<string>, message: string) =>
  Ref.get(tail).pipe(
    Effect.flatMap(output => Effect.fail(errorWithOutput(message, output))),
  )

const timeout = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  duration: Duration.Input,
  message: string,
): Effect.Effect<A, E | Error, R> =>
  effect.pipe(
    Effect.timeoutOrElse({
      duration,
      orElse: () => Effect.fail(new Error(message)),
    }),
  )

const releaseLatePromiseResult = <A>(
  signal: AbortSignal,
  pending: PromiseLike<A>,
  release: (value: A) => void,
): void => {
  signal.addEventListener(
    'abort',
    () => {
      Effect.runFork(
        Effect.tryPromise(() => pending).pipe(
          Effect.tap(value => Effect.sync(() => release(value))),
          Effect.ignoreCause,
        ),
      )
    },
    { once: true },
  )
}

const loadWebContainerApi = () =>
  timeout(
    Effect.tryPromise({
      try: () => import('@webcontainer/api'),
      catch: cause => new Error('WebContainer API failed to load.', { cause }),
    }),
    LOAD_API_TIMEOUT,
    `WebContainer API did not load within ${LOAD_API_TIMEOUT}.`,
  )

const bootWebContainer = (
  WebContainer: typeof import('@webcontainer/api').WebContainer,
) =>
  Effect.acquireRelease(
    timeout(
      Effect.tryPromise({
        try: signal => {
          const pending = WebContainer.boot({
            coep: 'credentialless',
            workdirName: 'foldkit',
          })
          releaseLatePromiseResult(signal, pending, container =>
            container.teardown(),
          )
          return pending
        },
        catch: cause => new Error('WebContainer failed to boot.', { cause }),
      }),
      BOOT_TIMEOUT,
      `WebContainer did not boot within ${BOOT_TIMEOUT}. This browser may not support the service worker WebContainer registers on its own origin.`,
    ),
    container => Effect.sync(() => container.teardown()),
    { interruptible: true },
  )

const fileSystemTreeFromFiles = (
  files: Readonly<Record<string, string>>,
): FileSystemTree => {
  const tree: FileSystemTree = {}
  for (const [path, contents] of Object.entries(files)) {
    const segments = path.split('/')
    const fileName = segments.pop()
    if (fileName === undefined) {
      continue
    }

    let cursor: FileSystemTree = tree
    for (const segment of segments) {
      const existing = cursor[segment]
      if (existing === undefined) {
        const directory: FileSystemTree = {}
        cursor[segment] = { directory }
        cursor = directory
      } else if ('directory' in existing) {
        cursor = existing.directory
      } else {
        throw new Error(
          `Playground file tree conflict: ${segment} is both a file and a directory`,
        )
      }
    }

    cursor[fileName] = { file: { contents } }
  }
  return tree
}

const mountFiles = (
  container: Pick<WebContainer, 'mount'>,
  files: Readonly<Record<string, string>>,
) =>
  timeout(
    Effect.tryPromise({
      try: () => container.mount(fileSystemTreeFromFiles(files)),
      catch: cause => new Error('Playground files failed to mount.', { cause }),
    }),
    MOUNT_TIMEOUT,
    `Playground files did not mount within ${MOUNT_TIMEOUT}.`,
  )

const spawnProcess = (
  container: ProcessHost,
  command: string,
  args: Array<string>,
  label: string,
) =>
  Effect.acquireRelease(
    timeout(
      Effect.tryPromise({
        try: signal => {
          const pending = container.spawn(command, args)
          releaseLatePromiseResult(signal, pending, process => process.kill())
          return pending
        },
        catch: cause => new Error(`${label} failed to start.`, { cause }),
      }),
      SPAWN_TIMEOUT,
      `${label} did not start within ${SPAWN_TIMEOUT}.`,
    ),
    process => Effect.sync(() => process.kill()),
    { interruptible: true },
  )

export const captureProcessOutput = (
  output: ReadableStream<string>,
  label: string,
) =>
  Effect.gen(function* () {
    const tail = yield* Ref.make('')
    const fiber = yield* Stream.fromReadableStream({
      evaluate: () => output,
      onError: cause => new Error(`Failed to read ${label} output.`, { cause }),
    }).pipe(
      Stream.runForEach(chunk =>
        Ref.update(tail, current => appendProcessOutputTail(current, chunk)),
      ),
      Effect.forkScoped({ startImmediately: true }),
    )
    return { tail, fiber }
  })

const awaitProcessExit = (process: PlaygroundProcess, label: string) =>
  Effect.tryPromise({
    try: () => process.exit,
    catch: cause =>
      new Error(`${label} exit status could not be read.`, { cause }),
  })

const awaitProcessCompletion = (
  process: PlaygroundProcess,
  output: CapturedProcessOutput,
  label: string,
) =>
  Effect.all([awaitProcessExit(process, label), Fiber.join(output.fiber)], {
    concurrency: 'unbounded',
  }).pipe(
    Effect.map(([exitCode]) => exitCode),
    Effect.catch(error => failWithOutput(output.tail, reasonFromError(error))),
  )

export const installDependencies = (container: ProcessHost) =>
  Effect.scoped(
    Effect.gen(function* () {
      const install = yield* spawnProcess(
        container,
        'npm',
        ['install'],
        'npm install',
      )
      const output = yield* captureProcessOutput(install.output, 'npm install')
      const exitCode = yield* awaitProcessCompletion(
        install,
        output,
        'npm install',
      ).pipe(
        Effect.timeoutOrElse({
          duration: INSTALL_TIMEOUT,
          orElse: () =>
            failWithOutput(
              output.tail,
              `npm install did not finish within ${INSTALL_TIMEOUT}.`,
            ),
        }),
      )
      if (exitCode !== 0) {
        return yield* failWithOutput(
          output.tail,
          `npm install exited with code ${exitCode}.`,
        )
      }
    }),
  )

const superviseDevServer = (
  process: PlaygroundProcess,
  output: CapturedProcessOutput,
) => {
  const processExit = Effect.gen(function* () {
    const exitResult = yield* awaitProcessExit(process, 'npm run dev').pipe(
      Effect.result,
    )
    yield* Fiber.join(output.fiber).pipe(
      Effect.timeoutOrElse({
        duration: PROCESS_OUTPUT_DRAIN_TIMEOUT,
        orElse: () => Effect.void,
      }),
      Effect.catch(error =>
        failWithOutput(output.tail, reasonFromError(error)),
      ),
    )
    return yield* Result.match(exitResult, {
      onFailure: error => failWithOutput(output.tail, reasonFromError(error)),
      onSuccess: exitCode =>
        failWithOutput(
          output.tail,
          `npm run dev exited with code ${exitCode}.`,
        ),
    })
  })
  const outputFailure = Fiber.join(output.fiber).pipe(
    Effect.flatMap(() => Effect.never),
    Effect.catch(error => failWithOutput(output.tail, reasonFromError(error))),
  )
  return Effect.raceFirst(processExit, outputFailure)
}

export const startDevServer = (container: ServerHost) =>
  Effect.gen(function* () {
    const serverFailure = yield* Deferred.make<never, Error>()
    const previewUrl = yield* Effect.acquireUseRelease(
      Effect.sync(() => {
        const ready = Deferred.makeUnsafe<string>()
        const unsubscribe = container.on('server-ready', (_port, url) => {
          Deferred.doneUnsafe(ready, Effect.succeed(url))
        })
        return { ready, unsubscribe }
      }),
      ({ ready }) =>
        Effect.gen(function* () {
          const dev = yield* spawnProcess(
            container,
            'npm',
            ['run', 'dev'],
            'npm run dev',
          )
          const output = yield* captureProcessOutput(dev.output, 'npm run dev')
          yield* superviseDevServer(dev, output).pipe(
            Deferred.into(serverFailure),
            Effect.forkScoped({ startImmediately: true }),
          )
          return yield* Effect.raceFirst(
            Deferred.await(ready),
            Deferred.await(serverFailure),
          ).pipe(
            Effect.timeoutOrElse({
              duration: DEV_SERVER_TIMEOUT,
              orElse: () =>
                failWithOutput(
                  output.tail,
                  `The dev server was not ready within ${DEV_SERVER_TIMEOUT}.`,
                ),
            }),
          )
        }),
      ({ unsubscribe }) => Effect.sync(unsubscribe),
    )
    return { previewUrl, serverFailure }
  })

export const acquirePlaygroundWebContainer = (
  files: Readonly<Record<string, string>>,
) =>
  Effect.gen(function* () {
    const { WebContainer } = yield* loadWebContainerApi()
    const container = yield* bootWebContainer(WebContainer)
    yield* mountFiles(container, files)
    yield* installDependencies(container)
    const { previewUrl, serverFailure } = yield* startDevServer(container)
    const pendingWrites = yield* FiberMap.make<string, void, never>()
    return { container, previewUrl, pendingWrites, serverFailure }
  }).pipe(Effect.interruptible)
