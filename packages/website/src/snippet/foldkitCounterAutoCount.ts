import { Duration, Effect, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const TICK_INTERVAL_MS = 1000

const Model = Schema.Struct({
  count: Schema.Number,
  isAutoCounting: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedToggleAutoCount: {},
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
  ClickedIncrement: CounterDefinition.makeFieldsStep(() => ({
    count: count => count + 1,
  })),
  ClickedToggleAutoCount: CounterDefinition.makeFieldsStep(() => ({
    isAutoCounting: isAutoCounting => !isAutoCounting,
  })),
  Ticked: CounterDefinition.makeFieldsStep(() => ({
    count: count => count + 1,
  })),
})

const view = CounterComposition.makeView((model, h) => ({
  title: `Count: ${model.count}`,
  body: h.div(
    [],
    [
      h.p([], [`Count: ${model.count}`]),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Increment']),
      h.button(
        [h.OnClick(Message.ClickedToggleAutoCount())],
        [model.isAutoCounting ? 'Stop' : 'Auto-Count'],
      ),
    ],
  ),
}))
