import { Match, Schema } from 'effect'
import { Block, Message } from 'foldkit'

type ExpectNever<Value extends never> = Value
type OutMessageOf<Output> = Output extends unknown
  ? 'outMessage' extends keyof Output
    ? Exclude<Output['outMessage'], undefined>
    : never
  : never
const Model = Schema.Struct({
  generation: Schema.Number,
  state: Schema.Literals(['Idle', 'Running', 'Finished']),
})
const LocalMessage = Message.defineMessageUnion({
  RequestedFinish: { generation: Schema.Number },
})
const OutMessage = Message.defineMessageUnion({ Finished: {} })
const Definition = Block.makeDefinition('UpstreamErasureLimitation', {
  Model,
  Message: LocalMessage,
  OutMessage,
})
const Composition = Definition.makeComposition()

const rawHelper = (model: typeof Model.Type, generation: number) => {
  if (model.generation !== generation) {
    return { model }
  }
  return Match.value(model.state).pipe(
    Match.when('Running', () => ({ model })),
    Match.when('Finished', () => ({
      model,
      outMessage: OutMessage.Finished(),
    })),
    Match.orElse(() => ({ model })),
  )
}

export const directHandler = Composition.makeUpdate({
  RequestedFinish: (model, { generation }) => {
    if (model.generation !== generation) {
      return { model }
    }
    return Match.value(model.state).pipe(
      Match.when('Running', () => ({ model })),
      Match.when('Finished', () => ({
        model,
        outMessage: OutMessage.Finished(),
      })),
      Match.orElse(() => ({ model })),
    )
  },
})
export const extractedHandler = Composition.makeUpdate({
  RequestedFinish: (model, { generation }) => rawHelper(model, generation),
})
const canonicalWrapperStep = Definition.makeStep((model, generation: number) =>
  rawHelper(model, generation),
)
export const wrappedHandler = Composition.makeUpdate({
  RequestedFinish: (model, { generation }) =>
    canonicalWrapperStep(model, generation),
})
export type AlreadyErased = ExpectNever<
  OutMessageOf<ReturnType<typeof rawHelper>>
>
export type DirectErased = ExpectNever<
  OutMessageOf<ReturnType<typeof directHandler>>
>
export type ExtractedErased = ExpectNever<
  OutMessageOf<ReturnType<typeof extractedHandler>>
>
export type WrappedErased = ExpectNever<
  OutMessageOf<ReturnType<typeof wrappedHandler>>
>

const model = Model.make({ generation: 1, state: 'Finished' })
const message = LocalMessage.RequestedFinish({ generation: 1 })
for (const update of [directHandler, extractedHandler, wrappedHandler]) {
  if (
    !JSON.stringify(update(model, message)).includes(
      '"outMessage":{"_tag":"Finished"}',
    )
  ) {
    throw new Error('The upstream-erasure control must actually emit Finished')
  }
}
