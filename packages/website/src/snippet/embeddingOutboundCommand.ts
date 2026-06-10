import { Effect, Schema as S } from 'effect'
import { Command, Port } from 'foldkit'
import { evo } from 'foldkit/struct'

import { CompletedReportCount } from './message'
import { ports } from './ports'

// An outbound Port is written from a Command. Port.emit encodes the value
// and delivers it to every host listener; the Command acknowledges with a
// Completed* Message like any other fire-and-forget Command.
export const ReportCount = Command.define(
  'ReportCount',
  { count: S.Number },
  CompletedReportCount,
)(({ count }) =>
  Port.emit(ports.outbound.countChanged, count).pipe(
    Effect.as(CompletedReportCount()),
  ),
)

// In update, emitting is just returning the Command:
const handleAdvance = (model: Model): UpdateReturn => {
  const count = model.count + model.step
  return [evo(model, { count: () => count }), [ReportCount({ count })]]
}
