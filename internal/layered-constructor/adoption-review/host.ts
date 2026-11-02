import { Effect, Layer, Schema } from 'effect'
import { Block, Program } from 'foldkit'
import type * as Command from 'foldkit/command'

import {
  HostReviewDefinition,
  ConstructorSource,
  InvocationSource,
  Message,
  Model,
  init,
  update,
  view,
} from './hostContract.js'
import { ReadEffectsLayer } from './hostProvider.js'

export const HostReviewBlock = HostReviewDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init,
    update,
    view,
    EffectsLayer: ReadEffectsLayer,
  }),
)
export const makeHostProgram = (container: HTMLElement) =>
  Program.makeElement({ block: HostReviewBlock, container })

const UnresolvedNamespace = Block.makeNamespace('UnresolvedHostReview')
const UnresolvedRead = UnresolvedNamespace.makeCommand('Read', {
  messages: [Message.CompletedRead],
})
const UnresolvedKey = Symbol('UnresolvedHostReview')
const UnresolvedDefinition = UnresolvedNamespace.makeDefinition({
  key: UnresolvedKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  effects: Block.makeEffectsContract<
    never,
    Command.HandlerOf<typeof UnresolvedRead>
  >(),
})
const UnresolvedComposition = UnresolvedDefinition.makeComposition()
const unresolvedInit = UnresolvedComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
const unresolvedUpdate = UnresolvedComposition.makeUpdate({
  ClickedRead: UnresolvedDefinition.makeCommandsStep(() => [UnresolvedRead()]),
  CompletedRead: UnresolvedDefinition.makeNoopStep(),
})

if (false) {
  // @ts-expect-error Ordinary independent completion requires providers before the boundary.
  UnresolvedDefinition.makeBlock(
    Effect.succeed({
      children: [],
      init: unresolvedInit,
      update: unresolvedUpdate,
      EffectsLayer: Layer.empty,
      hostHandlers: [UnresolvedRead],
    }),
  )

  // @ts-expect-error Another original Command's provider does not satisfy Read.
  HostReviewDefinition.makeBlock(
    Effect.succeed({
      children: [],
      init,
      update,
      view,
      EffectsLayer: UnresolvedRead.toLayer(
        Effect.succeed(() =>
          Effect.succeed(Message.CompletedRead({ value: 1 })),
        ),
      ),
    }),
  )

  const program = makeHostProgram(document.createElement('div'))
  // @ts-expect-error Startup retains both original provider Service requirements.
  Effect.runPromise(program.start())
  // @ts-expect-error Constructor-only provisioning does not supply invocation requirements.
  program.provide(Layer.succeed(ConstructorSource, 1)).start()
  // @ts-expect-error Invocation-only provisioning does not supply constructor requirements.
  program.provide(Layer.succeed(InvocationSource, 1)).start()
}
