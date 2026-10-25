import { Duration, Effect, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const TICK_INTERVAL_MS = 1000

const Model = Schema.Struct({
  count: Schema.Number,
  step: Schema.Number,
  isAutoCounting: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedToggleAutoCount: {},
  ChangedStep: { step: Schema.Number },
  Ticked: {},
})

const CounterDefinition = Block.makeDefinition('Counter', { Model, Message })
const CounterComposition = CounterDefinition.makeComposition()

const subscriptions = CounterDefinition.makeSubscriptions(entry => ({
  gameClockTicks: entry(
    'GameClockTicks',
    { isAutoCounting: Schema.Boolean },
    {
      messages: [Message.Ticked],
      modelToDependencies: model => ({
        isAutoCounting: model.isAutoCounting,
      }),
      handler: function* () {
        return ({ isAutoCounting }) =>
          Stream.when(
            Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
              Stream.drop(1),
              Stream.map(Message.Ticked),
            ),
            Effect.sync(() => isAutoCounting),
          )
      },
    },
  ),
}))

const update = CounterComposition.makeUpdate({
  ClickedIncrement: CounterDefinition.makeFieldsStep(model => ({
    count: count => count + model.step,
  })),
  ClickedToggleAutoCount: CounterDefinition.makeFieldsStep(() => ({
    isAutoCounting: isAutoCounting => !isAutoCounting,
  })),
  ChangedStep: CounterDefinition.makeFieldsStep.fromMessage(({ step }) => ({
    step: () => step,
  })),
  Ticked: CounterDefinition.makeFieldsStep(model => ({
    count: count => count + model.step,
  })),
})

const view = CounterComposition.makeView((model, h) => ({
  title: `Count: ${model.count}`,
  body: h.div(
    [],
    [
      h.p([], [`Count: ${model.count}`]),
      h.label(
        [],
        [
          'Step: ',
          h.input([
            h.OnInput(value => Message.ChangedStep({ step: Number(value) })),
          ]),
        ],
      ),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Increment']),
      h.button(
        [h.OnClick(Message.ClickedToggleAutoCount())],
        [model.isAutoCounting ? 'Stop' : 'Auto-Count'],
      ),
    ],
  ),
}))
