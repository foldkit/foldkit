import { Effect, Schema } from 'effect'
import { Command, Port } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import { ports } from './ports'

// An outbound Port is written from a Command. Port.emit encodes the value
// and delivers it to every host listener; the Command acknowledges with a
// Completed* Message like any other fire-and-forget Command.
export const ReportCount = Command.define('ReportCount', {
  args: { count: Schema.Number },
  messages: [Message.CompletedReportCount],
  handler: function* () {
    return ({ count }) =>
      Port.emit(ports.outbound.countChanged, count).pipe(
        Effect.as(Message.CompletedReportCount()),
      )
  },
})

export const EffectsLayer = ReportCount.layer

// In update, emitting is just returning the Command:
const handleAdvance = (model: Model): UpdateReturn => {
  const count = model.count + model.step
  return {
    model: modifyFields(model, { count: () => count }),
    commands: [ReportCount({ count })],
  }
}
