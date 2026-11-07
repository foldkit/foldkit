import { Context, Data, Effect, Layer, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { taggedStruct } from 'foldkit/schema'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

export class Store extends Context.Service<
  Store,
  Readonly<{ label: string }>
>()('ManagedResourceContract/Store') {}
export class Construction extends Context.Service<
  Construction,
  Readonly<{ label: string }>
>()('ManagedResourceContract/Construction') {}
export const HandlerUnavailable = taggedStruct('HandlerUnavailable', {})
export type HandlerUnavailable = typeof HandlerUnavailable.Type
export class ConstructionUnavailable extends Data.TaggedError(
  'ConstructionUnavailable',
) {}

export const Namespace = Block.makeNamespace('ManagedResourceContract')
export const Session = Namespace.makeResource<string>()('Session')
export const Model = Schema.Struct({ label: Schema.String })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  RequestedRead: {},
  CompletedRead: { label: Schema.String },
  CompletedAcquire: {},
  CompletedRelease: {},
  FailedAcquire: {},
})
export type Message = typeof Message.Type
export const InMessage = defineInMessageUnion({ RequestedRefresh: {} })
export type InMessage = typeof InMessage.Type
export const ManagedResourceContractKey = Symbol('ManagedResourceContract')
export const SessionBlock = Block.make(Namespace, {
  key: ManagedResourceContractKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([]),
  effects: {
    managedResources: [Session],
    services: [Store],
    Error: HandlerUnavailable,
  },
  operations: {
    read: { message: Message.RequestedRead, managedResources: [Session] },
  },
  inMessageOutputs: { RequestedRefresh: { managedResources: [Session] } },
})
export const Read = SessionBlock.makeCommand('Read', {
  messages: [Message.CompletedRead],
  handler: function* () {
    const store = yield* Store

    if (store.label === '') {
      return yield* Effect.fail(HandlerUnavailable())
    }

    return () =>
      Session.get.pipe(
        Effect.map(label => Message.CompletedRead({ label })),
        Effect.catch(() =>
          Effect.succeed(Message.CompletedRead({ label: store.label })),
        ),
      )
  },
})
export const managedResources = SessionBlock.makeManagedResources(entry => ({
  session: entry('ManageSession', Schema.Option(Schema.Null), {
    resource: Session,
    modelToMaybeRequirements: () => Option.some(null),
    onAcquired: () => Message.CompletedAcquire(),
    onReleased: () => Message.CompletedRelease(),
    onAcquireError: () => Message.FailedAcquire(),
    handler: function* () {
      return {
        acquire: () => Effect.succeed('ready'),
        release: () => Effect.void,
      }
    },
  }),
}))
const composition = SessionBlock.makeComposition()
export const layer = SessionBlock.makeLayer(
  Effect.gen(function* () {
    const construction = yield* Construction

    if (construction.label === '') {
      return yield* new ConstructionUnavailable()
    }

    return {
      children: [],
      init: composition.makeInit(() => ({ model: Model.make({ label: '' }) })),
      update: composition.makeUpdate({
        RequestedRead: SessionBlock.makeCommandsStep(() => [Read()]),
        CompletedRead: (model, { label }) => ({
          model: modifyFields(model, { label: () => label }),
        }),
        CompletedAcquire: SessionBlock.makeNoopStep(),
        CompletedRelease: SessionBlock.makeNoopStep(),
        FailedAcquire: SessionBlock.makeNoopStep(),
      }),
      inMessageUpdate: composition.makeInMessageUpdate({
        RequestedRefresh: SessionBlock.makeCommandsStep(() => [Read()]),
      }),
      managedResources,
      EffectsLayer: Layer.merge(Read.layer, managedResources.layer),
    }
  }),
)
export const subject = { block: SessionBlock, layer }
export const inspect = Story.withBlock(subject, executable => ({
  read: executable.operations.read(executable.init().model),
  refresh: executable.operations.requestRefresh(executable.init().model),
}))
