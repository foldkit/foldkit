import { Effect, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ count: Schema.Int })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedResetAfterDelay: {},
  CompletedWaitBeforeReset: {},
})
export type Message = typeof Message.Type

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeFieldsStep, makeCommandsStep } = ApplicationDefinition

export const ApplicationComposition = ApplicationDefinition.makeComposition()

export const WaitBeforeReset = ApplicationDefinition.makeCommand(
  'WaitBeforeReset',
  {
    messages: [Message.CompletedWaitBeforeReset],
    handler: function* () {
      return () =>
        Effect.sleep('1 second').pipe(
          Effect.as(Message.CompletedWaitBeforeReset()),
        )
    },
  },
)

export const EffectsLayer = WaitBeforeReset.layer

export const init = ApplicationComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))

export const update = ApplicationComposition.makeUpdate({
  ClickedIncrement: makeFieldsStep(() => ({
    count: Number.increment,
  })),
  ClickedResetAfterDelay: makeCommandsStep(() => [WaitBeforeReset()]),
  CompletedWaitBeforeReset: makeFieldsStep(() => ({
    count: () => 0,
  })),
})

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `Counter: ${model.count}`,
  body: h.main(
    [],
    [
      h.p([], [`Count: ${model.count}`]),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Increment']),
      h.button(
        [h.OnClick(Message.ClickedResetAfterDelay())],
        ['Reset after one second'],
      ),
    ],
  ),
}))

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    EffectsLayer,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
