import {
  Array,
  Deferred,
  Effect,
  FiberMap,
  HashMap,
  Option,
  Ref,
  Schema,
  Stream,
} from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  type PlaygroundWebContainer,
  acquirePlaygroundWebContainer,
  reasonFromError,
} from '../playgroundWebContainer'

// NOTE: Vite's HMR for a content file (`src/application.ts`) doesn't reliably
// invalidate Tailwind's CSS module in the WebContainer. After writing the
// content file, we write `src/styles.css` back to itself so Vite emits a
// CSS HMR update; that re-runs the Tailwind plugin against the latest
// content tree and the new utility classes show up in the preview.
const STYLES_CSS_PATH = 'src/styles.css'

const WRITE_DEBOUNCE_MILLIS = 250

const WEB_CONTAINER_NOT_READY = 'WebContainer not yet ready'

const Message = defineMessageUnion({
  BootedWebContainer: { previewUrl: Schema.String },
  FailedWebContainerBoot: { reason: Schema.String },
  FailedWebContainerServer: { reason: Schema.String },
  RequestedFileWrite: { path: Schema.String, content: Schema.String },
  SucceededScheduleFileWrite: {},
  FailedScheduleFileWrite: { reason: Schema.String },
})
type Message = typeof Message.Type
type ScheduleFileWriteResult =
  | typeof Message.SucceededScheduleFileWrite.Type
  | typeof Message.FailedScheduleFileWrite.Type

const OutMessage = defineMessageUnion({
  Booted: { previewUrl: Schema.String },
  Failed: { reason: Schema.String },
  ScheduledFileWrite: {},
  FailedFileWrite: { reason: Schema.String },
})

const Model = Schema.Struct({
  containerKey: Schema.String,
  files: Schema.Record(Schema.String, Schema.String),
})
type Model = typeof Model.Type

export const ScheduleFileWrite = Command.define('ScheduleFileWrite', {
  args: {
    containerKey: Schema.String,
    path: Schema.String,
    content: Schema.String,
  },
  messages: [
    Message.SucceededScheduleFileWrite,
    Message.FailedScheduleFileWrite,
  ],
})

type PlaygroundContainerArgs = Readonly<{
  files: Readonly<Record<string, string>>
}>

export class PlaygroundContainer extends Block<
  PlaygroundContainer,
  PlaygroundContainerArgs
>()('PlaygroundContainer', {
  Model,
  Message,
  OutMessage,
  Command: [ScheduleFileWrite],
}) {}

export const PlaygroundContainerLive = PlaygroundContainer.toLayer(
  Effect.gen(function* () {
    const webContainers = yield* Ref.make(
      HashMap.empty<string, PlaygroundWebContainer>(),
    )

    const registerWebContainer = (
      containerKey: string,
      webContainer: PlaygroundWebContainer,
    ) =>
      Effect.acquireRelease(
        Ref.update(webContainers, HashMap.set(containerKey, webContainer)),
        () => Ref.update(webContainers, HashMap.remove(containerKey)),
      )

    const bootWebContainer = ({
      containerKey,
      files,
    }: Model): Stream.Stream<Message> =>
      Stream.unwrap(
        acquirePlaygroundWebContainer(files).pipe(
          Effect.tap(webContainer =>
            registerWebContainer(containerKey, webContainer),
          ),
          Effect.map(({ previewUrl, serverFailure }): Stream.Stream<Message> =>
            Stream.concat(
              Stream.make(Message.BootedWebContainer({ previewUrl })),
              Stream.fromEffect(
                Deferred.await(serverFailure).pipe(
                  Effect.catch(error =>
                    Effect.succeed(
                      Message.FailedWebContainerServer({
                        reason: reasonFromError(error),
                      }),
                    ),
                  ),
                ),
              ),
            ).pipe(Stream.concat(Stream.never)),
          ),
          Effect.catch(error =>
            Effect.succeed<Stream.Stream<Message>>(
              Stream.make(
                Message.FailedWebContainerBoot({
                  reason: reasonFromError(error),
                }),
              ),
            ),
          ),
        ),
      )

    return {
      init: ({ files }, { path }) => ({
        containerKey: Array.join(path, '/'),
        files,
      }),

      update: {
        BootedWebContainer: (model, { previewUrl }) => ({
          model,
          outMessage: OutMessage.Booted({ previewUrl }),
        }),
        FailedWebContainerBoot: (model, { reason }) => ({
          model,
          outMessage: OutMessage.Failed({ reason }),
        }),
        FailedWebContainerServer: (model, { reason }) => ({
          model,
          outMessage: OutMessage.Failed({ reason }),
        }),
        RequestedFileWrite: (model, { path, content }) => ({
          model,
          commands: [
            ScheduleFileWrite({
              containerKey: model.containerKey,
              path,
              content,
            }),
          ],
        }),
        SucceededScheduleFileWrite: model => ({
          model,
          outMessage: OutMessage.ScheduledFileWrite(),
        }),
        FailedScheduleFileWrite: (model, { reason }) => ({
          model,
          outMessage: OutMessage.FailedFileWrite({ reason }),
        }),
      },

      commands: {
        ScheduleFileWrite: ({ containerKey, path, content }) =>
          Ref.get(webContainers).pipe(
            Effect.map(HashMap.get(containerKey)),
            Effect.flatMap(
              Option.match<
                Effect.Effect<ScheduleFileWriteResult>,
                PlaygroundWebContainer
              >({
                onNone: () =>
                  Effect.succeed(
                    Message.FailedScheduleFileWrite({
                      reason: WEB_CONTAINER_NOT_READY,
                    }),
                  ),
                onSome: ({ container: webContainer, pendingWrites }) =>
                  FiberMap.run(
                    pendingWrites,
                    path,
                    writeFile(webContainer, path, content),
                    { startImmediately: true },
                  ).pipe(Effect.as(Message.SucceededScheduleFileWrite())),
              }),
            ),
          ),
      },

      subscriptions: {
        webContainer: {
          dependencies: ({ containerKey, files }) => ({ containerKey, files }),
          stream: bootWebContainer,
        },
      },
    }
  }),
)

const writeFile = (
  webContainer: PlaygroundWebContainer['container'],
  path: string,
  content: string,
) =>
  Effect.gen(function* () {
    yield* Effect.sleep(WRITE_DEBOUNCE_MILLIS)
    yield* Effect.tryPromise(() => webContainer.fs.writeFile(path, content))
    if (path !== STYLES_CSS_PATH) {
      const stylesContent = yield* Effect.tryPromise(() =>
        webContainer.fs.readFile(STYLES_CSS_PATH, 'utf-8'),
      )
      yield* Effect.tryPromise(() =>
        webContainer.fs.writeFile(STYLES_CSS_PATH, stylesContent),
      )
    }
  }).pipe(
    Effect.catch(error =>
      Effect.logError(
        `[playground] Debounced write failed for ${path}:`,
        error,
      ),
    ),
  )
