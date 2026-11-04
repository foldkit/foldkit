import { Effect, Schema, Stream } from 'effect'
import { ApplicationBlock, ApplicationComposition, makeFieldsStep, makeCommand as importedCommand, makeMount, makeMountStream, makeSubscriptions, makeManagedResources } from '../shared/unified'

const ReadClock = ApplicationBlock.makeCommand('ReadClock', {
  messages: [ApplicationBlock.Message.UpdatedStamp],
  handler: function* () {
    return () => Effect.succeed(ApplicationBlock.Message.UpdatedStamp({ value: Date.now() }))
  },
})

export const layer = ApplicationBlock.makeLayer(Effect.gen(function* () {
  const stamp = Date.now()
  const init = ApplicationComposition.makeInit(() => ({ model: { stamp } }))
  const update = ApplicationComposition.makeUpdate({
    UpdatedStamp: makeFieldsStep.fromMessage(({ value }) => ({ stamp: () => value })),
  })

  return { init, update, EffectsLayer: ReadClock.layer }
}))

const { makeCommand } = ApplicationBlock
export const LocalClock = makeCommand('LocalClock', {
  messages: [ApplicationBlock.Message.UpdatedStamp],
  handler: function* () {
    return () => Effect.succeed(ApplicationBlock.Message.UpdatedStamp({ value: Math.random() }))
  },
})
export const ImportedClock = importedCommand('ImportedClock', {
  messages: [ApplicationBlock.Message.UpdatedStamp],
  handler: function* () {
    return () => Effect.succeed(ApplicationBlock.Message.UpdatedStamp({ value: Date.now() }))
  },
})
export const ObserveClock = makeMount('ObserveClock', {
  handler: function* () { return () => Effect.succeed(Date.now()) },
})
export const StreamClock = makeMountStream('StreamClock', {
  handler: function* () { return () => Stream.make(Math.random()) },
})
export const subscriptions = makeSubscriptions(entry => ({
  clock: entry('Clock', {}, {
    messages: [Schema.Number],
    modelToDependencies: () => ({}),
    handler: function* () { return () => Stream.make(Date.now()) },
  }),
}))
export const managedResources = makeManagedResources(entry => ({
  clock: entry('ClockResource', {}, {
    resource: Schema.Number,
    modelToMaybeRequirements: () => requirements,
    handler: function* () { return {
      acquire: () => Effect.succeed(Date.now()),
      release: () => Effect.succeed(Math.random()),
    } },
  }),
}))
