import { Effect, Option, Ref, Schema, Scope } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  type PlaygroundWebContainer,
  acquirePlaygroundWebContainer,
  reasonFromError,
} from '../playgroundWebContainer'

const Message = defineMessageUnion({
  SucceededBootPlayground: { previewUrl: Schema.String },
  FailedBootPlayground: { reason: Schema.String },
})

const OutMessage = defineMessageUnion({
  Booted: { previewUrl: Schema.String },
  FailedBoot: { reason: Schema.String },
})

const BootPlayground = Command.define('BootPlayground', {
  messages: [Message.SucceededBootPlayground, Message.FailedBootPlayground],
})

type PlaygroundContainerArgs = Readonly<{
  files: Readonly<Record<string, string>>
}>

type PlaygroundContainerHandle = Readonly<{
  current: Effect.Effect<Option.Option<PlaygroundWebContainer>>
}>

export class PlaygroundContainer extends Block<
  PlaygroundContainer,
  PlaygroundContainerArgs,
  void,
  PlaygroundContainerHandle
>()('PlaygroundContainer', {
  Message,
  OutMessage,
  Command: [BootPlayground],
}) {}

export const PlaygroundContainerLive = PlaygroundContainer.make(
  Effect.fn(function* (_id, { files }) {
    const scope = yield* Effect.scope
    const containerRef = yield* Ref.make(Option.none<PlaygroundWebContainer>())

    return {
      start: [BootPlayground()],

      update: {
        SucceededBootPlayground: (model, { previewUrl }) => ({
          model,
          outMessage: OutMessage.Booted({ previewUrl }),
        }),
        FailedBootPlayground: (model, { reason }) => ({
          model,
          outMessage: OutMessage.FailedBoot({ reason }),
        }),
      },

      commands: {
        BootPlayground: () =>
          acquirePlaygroundWebContainer(files).pipe(
            Scope.provide(scope),
            Effect.tap(container =>
              Ref.set(containerRef, Option.some(container)),
            ),
            Effect.map(({ previewUrl }) =>
              Message.SucceededBootPlayground({ previewUrl }),
            ),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedBootPlayground({
                  reason: reasonFromError(error),
                }),
              ),
            ),
          ),
      },

      expose: { current: Ref.get(containerRef) },
    }
  }),
)
