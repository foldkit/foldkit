import { Effect, Schema } from 'effect'
import { Block, Command, Port } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { hostStepChanges } from './embeddingInboundSubscription'
import { type Flags, ports } from './embeddingPorts'
import { Message } from './embeddingWidgetMessage'

// An outbound Port is written from a Command. Port.emit encodes the value
// and delivers it to every host listener.
const ReportCount = Command.define('ReportCount', {
  args: { count: Schema.Number },
  messages: [Message.CompletedReportCount],
})

export class Widget extends Block<Widget, Readonly<{ flags: Flags }>>()(
  'Widget',
  {
    Model: Schema.Struct({ count: Schema.Number, step: Schema.Number }),
    Message,
    Command: [ReportCount],
  },
) {}

export const WidgetLive = Widget.make(
  Effect.fn(function* (_id, { flags }) {
    return {
      model: { count: flags.initialCount, step: 1 },

      stream: hostStepChanges,

      update: {
        ClickedAdvance: model => {
          const count = model.count + model.step

          return {
            model: modifyFields(model, { count: () => count }),
            commands: [ReportCount({ count })],
          }
        },
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

      view: (model, h) =>
        h.button(
          [h.OnClick(Message.ClickedAdvance())],
          [`${model.count} (advance by ${model.step})`],
        ),
    }
  }),
)
