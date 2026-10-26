import { Effect, Layer, Option, Schema, Stream } from 'effect'
import { Block, Message, Program, Struct } from 'foldkit'

import type { Assembled } from './from-assembly.accepted.js'

const Model = Schema.Struct({ status: Schema.String })
const RootMessage = Message.defineMessageUnion({
  CompletedWork: { value: Schema.String },
})
const Definition = Block.makeDefinition('InferredPortableProgram', {
  Model,
  Message: RootMessage,
})
const RunWork = Definition.makeCommand('RunWork', {
  messages: [RootMessage.CompletedWork],
  handler: function* () {
    return () => Effect.succeed(RootMessage.CompletedWork({ value: 'command' }))
  },
})
const ObserveElement = Definition.makeMount('ObserveElement', {
  messages: [RootMessage.CompletedWork],
  handler: function* () {
    return () => Effect.succeed(RootMessage.CompletedWork({ value: 'mount' }))
  },
})
const subscriptions = Definition.makeSubscriptions(entry => ({
  work: entry('ObserveWork', {
    messages: [RootMessage.CompletedWork],
    handler: function* () {
      return () =>
        Stream.succeed(RootMessage.CompletedWork({ value: 'subscription' }))
    },
  }),
}))
const Resource = Definition.makeResource<string>()('Resource')
const managedResources = Definition.makeManagedResources(entry => ({
  resource: entry('ManageResource', Schema.Option(Schema.Null), {
    resource: Resource,
    modelToMaybeRequirements: () => Option.none<null>(),
    onAcquired: value => RootMessage.CompletedWork({ value }),
    onReleased: () => RootMessage.CompletedWork({ value: 'released' }),
    onAcquireError: () => RootMessage.CompletedWork({ value: 'failed' }),
    handler: function* () {
      return {
        acquire: () => Effect.succeed('resource'),
        release: () => Effect.void,
      }
    },
  }),
}))
const Composition = Definition.makeComposition({ mounts: [ObserveElement] })
export const prepareRootBlock = () =>
  Composition.prepareBlock({
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: Composition.makeUpdate({
      CompletedWork: (model, { value }) => ({
        model: Struct.modifyFields(model, { status: () => value }),
      }),
    }),
    view: Composition.makeView((model, h) =>
      h.button([h.OnMount(ObserveElement())], [model.status]),
    ),
    subscriptions,
    managedResources,
    EffectsLayer: Layer.mergeAll(
      RunWork.layer,
      ObserveElement.layer,
      subscriptions.work.layer,
      managedResources.resource.layer,
    ),
  })

export const RawRootBlock: Assembled<typeof prepareRootBlock> =
  Block.assemble(prepareRootBlock)
export const RootBlock: Block.FromAssemblyWithView<
  typeof Composition.Model,
  typeof prepareRootBlock
> = Block.assemble(prepareRootBlock)

export const inferredPortableProgram = Program.makeElement({
  block: RootBlock,
  container: null,
  devTools: false,
})

export {
  Model,
  Composition,
  subscriptions,
  managedResources,
  Resource,
  RunWork,
  ObserveElement,
}
