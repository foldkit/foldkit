import { Duration, Effect, Layer, Schema, Stream, pipe } from 'effect'
import { Application, Command, Port, Subscription, Update } from 'foldkit'
import { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

// MODEL

export const Model = Schema.Struct({
  count: Schema.Number,
  step: Schema.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  Ticked: {},
  ClickedAdvance: {},
  ChangedStep: { step: Schema.Number },
  CompletedReportCount: {},
})

export type Message = typeof Message.Type

// PORT

export const ports = {
  inbound: { stepChanged: Port.inbound(Schema.Number) },
  outbound: { countChanged: Port.outbound(Schema.Number) },
}

// INIT

export const Flags = Schema.Struct({ initialCount: Schema.Number })
export type Flags = typeof Flags.Type

export const init = (flags: Flags) => ({
  model: Model.make({ count: flags.initialCount, step: 1 }),
})

// COMMAND

export const ReportCount = Command.define('ReportCount', {
  args: { count: Schema.Number },
  messages: [Message.CompletedReportCount],
})

const ReportCountLive = ReportCount.toLayer(({ count }) =>
  Port.emit(ports.outbound.countChanged, count).pipe(
    Effect.as(Message.CompletedReportCount()),
  ),
)

// UPDATE

const advance = (model: Model) => {
  const count = model.count + model.step
  return {
    model: modifyFields(model, { count: () => count }),
    commands: [ReportCount({ count })],
  }
}

export const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    Ticked: () => advance(model),
    ClickedAdvance: () => advance(model),
    ChangedStep: ({ step }) => ({
      model: modifyFields(model, { step: () => step }),
    }),
    CompletedReportCount: () => ({ model }),
  }),
)

// SUBSCRIPTION

const TICK_INTERVAL = Duration.seconds(1)

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  tick: entry('WidgetTicks', { messages: [Message.Ticked] }),
  hostStep: Port.subscriptionEntry(ports.inbound.stepChanged, step =>
    Message.ChangedStep({ step }),
  ),
}))

const WidgetTicksLive = subscriptions.tick.toLayer(() =>
  Stream.tick(TICK_INTERVAL).pipe(Stream.drop(1), Stream.map(Message.Ticked)),
)

export const Live = Layer.mergeAll(ReportCountLive, WidgetTicksLive)

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Class(
        'flex flex-col items-center gap-4 rounded-xl border border-teal-200 bg-teal-50 p-6',
      ),
    ],
    [
      h.div(
        [
          h.Class(
            'text-xs font-semibold uppercase tracking-wide text-teal-700',
          ),
        ],
        ['Foldkit widget'],
      ),
      h.div(
        [h.Class('text-5xl font-bold tabular-nums text-gray-900')],
        [String(model.count)],
      ),
      h.div(
        [h.Class('text-sm text-gray-600')],
        [`Ticking up by ${model.step} every second`],
      ),
      Button.view(
        {
          onClick: Message.ClickedAdvance(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500',
                ),
              ],
              [`Advance by ${model.step}`],
            ),
        },
        h,
      ),
    ],
  )

// PROGRAM

export const makeElement = (container: HTMLElement, flags: Flags) =>
  pipe(
    Application.makeElement({
      Model,
      Flags,
      flags: Effect.succeed(flags),
      init,
      update,
      view,
      subscriptions,
      ports,
      container,
      devTools: {
        Message,
      },
    }),
    Application.provide(Live),
  )
