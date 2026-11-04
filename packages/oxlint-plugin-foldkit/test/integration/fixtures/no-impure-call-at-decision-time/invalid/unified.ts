import { Effect } from 'effect'
import { ApplicationBlock, ApplicationComposition, makeFieldsStep as importedFields } from '../shared/unified'

export const layer = ApplicationBlock.makeLayer(Effect.gen(function* () {
  const { makeFieldsStep } = ApplicationBlock
  const direct = ApplicationBlock.makeFieldsStep(() => ({ stamp: () => Date.now() }))
  const destructured = makeFieldsStep(() => ({ stamp: () => Math.random() }))
  const imported = importedFields(() => ({ stamp: () => performance.now() }))
  const update = ApplicationComposition.makeUpdate({
    UpdatedStamp: model => ({ model: { ...model, stamp: Date.now() } }),
  })

  return { init, update, direct, destructured, imported }
}))

export const ReadEagerClock = ApplicationBlock.makeCommand('ReadEagerClock', {
  messages: [ApplicationBlock.Message.UpdatedStamp],
  handler: function* () {
    performance.now()
    return () => Effect.void
  },
})
