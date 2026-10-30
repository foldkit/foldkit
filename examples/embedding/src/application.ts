import { Duration, Effect, Schema, Stream } from 'effect'
import { Block, Command, Port } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

export const Model = Schema.Struct({
  count: Schema.Number,
  step: Schema.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  Ticked: {},
  ClickedAdvance: {},
  ChangedStep: { step: Schema.Number },
  CompletedReportCount: {},
})
export type Message = typeof Message.Type

export const Flags = Schema.Struct({ initialCount: Schema.Number })
export type Flags = typeof Flags.Type

// PORT

export const ports = {
  inbound: { stepChanged: Port.inbound(Schema.Number) },
  outbound: { countChanged: Port.outbound(Schema.Number) },
}

// COMMAND

export const ReportCount = Command.define('ReportCount', {
  args: { count: Schema.Number },
  messages: [Message.CompletedReportCount],
})

export class Application extends Block<
  Application,
  Readonly<{ flags: Flags }>
>()('Application', {
  Model,
  Message,
  Command: [ReportCount],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags }) {
    return {
      model: { count: flags.initialCount, step: 1 },

      update: {
        Ticked: advance,
        ClickedAdvance: advance,
        ChangedStep: (model, { step }) => ({
          model: modifyFields(model, { step: () => step }),
        }),
        CompletedReportCount: model => ({ model }),
      },

      commands: {
        ReportCount: ({ count }) =>
          Port.emit(ports.outbound.countChanged, count).pipe(
            Effect.as(Message.CompletedReportCount()),
          ),
      },

      subscriptions: {
        widgetTicks: { dependencies: () => null, stream: () => widgetTicks },
        hostStepChanges: {
          dependencies: () => null,
          stream: () => hostStepChanges,
        },
      },

      view,
    }
  }),
)

const advance = (model: Model) => {
  const count = model.count + model.step
  return {
    model: modifyFields(model, { count: () => count }),
    commands: [ReportCount({ count })],
  }
}

const TICK_INTERVAL = Duration.seconds(1)

const widgetTicks = Stream.tick(TICK_INTERVAL).pipe(
  Stream.drop(1),
  Stream.map(Message.Ticked),
)

const hostStepChanges = Port.stream(ports.inbound.stepChanged).pipe(
  Stream.map(step => Message.ChangedStep({ step })),
)

// VIEW

const view = (model: Model, h: HtmlBuilder<Message>) =>
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
