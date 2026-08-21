import { Duration, Effect, Schema as S, Stream } from 'effect'
import { Command, Port, Runtime, Subscription, type Update } from 'foldkit'
import { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

// MODEL

export const Model = S.Struct({ count: S.Number, step: S.Number })
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  Ticked: {},
  ClickedAdvance: {},
  ChangedStep: { step: S.Number },
  CompletedReportCount: {},
})

export type Message = typeof Message.Type

// PORT

export const ports = {
  inbound: { stepChanged: Port.inbound(S.Number) },
  outbound: { countChanged: Port.outbound(S.Number) },
}

// INIT

export const Flags = S.Struct({ initialCount: S.Number })
export type Flags = typeof Flags.Type

export const init: Runtime.ElementInit<Model, Message, Flags> = flags => ({
  model: { count: flags.initialCount, step: 1 },
})

// COMMAND

export const ReportCount = Command.define('ReportCount', {
  args: { count: S.Number },
  messages: [Message.CompletedReportCount],
  execute: ({ count }) =>
    Port.emit(ports.outbound.countChanged, count).pipe(
      Effect.as(Message.CompletedReportCount()),
    ),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

const advance = (model: Model): UpdateReturn => {
  const count = model.count + model.step
  return {
    model: evo(model, { count: () => count }),
    commands: [ReportCount({ count })],
  }
}

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    Ticked: () => advance(model),
    ClickedAdvance: () => advance(model),
    ChangedStep: ({ step }) => ({ model: evo(model, { step: () => step }) }),
    CompletedReportCount: () => ({ model }),
  })

// SUBSCRIPTION

const TICK_INTERVAL = Duration.seconds(1)

export const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  tick: Subscription.persistent(
    Stream.tick(TICK_INTERVAL).pipe(Stream.map(Message.Ticked)),
  ),
  hostStep: Port.subscription(ports.inbound.stepChanged, step =>
    Message.ChangedStep({ step }),
  ),
}))

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
  Runtime.makeElement({
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
  })
