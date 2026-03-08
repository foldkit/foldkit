import { Duration, Effect, Match as M, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'
import { Command } from 'foldkit/command'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const TICK_INTERVAL_MS = 1000

// MODEL

const Model = S.Struct({
  count: S.Number,
  step: S.Number,
  isAutoCounting: S.Boolean,
})
type Model = typeof Model.Type

// MESSAGE

const ClickedIncrement = m('ClickedIncrement')
const ClickedToggleAutoCount = m('ClickedToggleAutoCount')
const ChangedStep = m('ChangedStep', { step: S.Number })
const Ticked = m('Ticked')

const Message = S.Union(ClickedIncrement, ClickedToggleAutoCount, ChangedStep, Ticked)
type Message = typeof Message.Type

// SUBSCRIPTION

const SubscriptionDeps = S.Struct({
  tick: S.Struct({ isAutoCounting: S.Boolean }),
})

const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<Model, Message>({
  tick: {
    modelToDependencies: model => ({
      isAutoCounting: model.isAutoCounting,
    }),
    depsToStream: ({ isAutoCounting }) =>
      Stream.when(
        Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
          Stream.map(() => Effect.succeed(Ticked())),
        ),
        () => isAutoCounting,
      ),
  },
})

// UPDATE

type UpdateReturn = [Model, ReadonlyArray<Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedIncrement: () => [evo(model, { count: count => count + model.step }), []],
      ClickedToggleAutoCount: () => [
        evo(model, {
          isAutoCounting: isAutoCounting => !isAutoCounting,
        }),
        [],
      ],
      ChangedStep: ({ step }) => [evo(model, { step: () => step }), []],
      Ticked: () => [evo(model, { count: count => count + model.step }), []],
    }),
  )

// VIEW

const { div, button, p, label, input, OnClick, OnInput } = html<Message>()

const view = (model: Model): Html =>
  div(
    [],
    [
      p([], [`Count: ${model.count}`]),
      label(
        [],
        ['Step: ', input([OnInput(value => ChangedStep({ step: Number(value) }))])],
      ),
      button([OnClick(ClickedIncrement())], ['Increment']),
      button(
        [OnClick(ClickedToggleAutoCount())],
        [model.isAutoCounting ? 'Stop' : 'Auto-Count'],
      ),
    ],
  )
