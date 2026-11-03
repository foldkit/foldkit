import { Context, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  ClickedRead: {},
  CompletedRead: { value: Schema.Number },
})

export type Message = typeof Message.Type

export class ConstructorSource extends Context.Service<
  ConstructorSource,
  number
>()('adoption-review/ConstructorSource') {}
export class InvocationSource extends Context.Service<
  InvocationSource,
  number
>()('adoption-review/InvocationSource') {}
export class ProviderFailure extends Schema.TaggedError<ProviderFailure>()(
  'ProviderFailure',
  { reason: Schema.String },
) {}

const HostReviewNamespace = Block.makeNamespace('HostReview')
export const Read = HostReviewNamespace.makeCommand('Read', {
  messages: [Message.CompletedRead],
})
export const HostReviewKey = Symbol('HostReview')
export const HostReviewDefinition = HostReviewNamespace.makeDefinition({
  key: HostReviewKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<
    ProviderFailure,
    ConstructorSource | InvocationSource
  >(),
})
const Composition = HostReviewDefinition.makeComposition()
export const init = Composition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
export const update = Composition.makeUpdate({
  ClickedRead: HostReviewDefinition.makeCommandsStep(() => [Read()]),
  CompletedRead: HostReviewDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ count: () => value }),
  ),
})
export const view = Composition.makeView((model, h) =>
  h.div(
    [],
    [
      h.button(
        [h.Id('host-review-read'), h.OnClick(Message.ClickedRead())],
        ['Read'],
      ),
      h.p([h.Id('host-review-count')], [String(model.count)]),
    ],
  ),
)
