import { Context, Effect, Schema } from 'effect'
import { Block, Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export type Chart = Readonly<{ destroy: () => void }>

export class ChartLibrary extends Context.Service<
  ChartLibrary,
  Readonly<{
    load: Effect.Effect<
      Readonly<{
        create: (element: Element, data: ReadonlyArray<number>) => Chart
      }>,
      Error
    >
  }>
>()('ChartLibrary') {}

const ChartData = Schema.Array(Schema.Number)

const Message = defineMessageUnion({
  SucceededMountChart: {},
  FailedMountChart: { reason: Schema.String },
})

const MountChart = Mount.define('MountChart', {
  args: { data: ChartData },
  messages: [Message.SucceededMountChart, Message.FailedMountChart],
})

export class Sales extends Block<Sales>()('Sales', {
  Model: Schema.Struct({ monthlyTotals: ChartData }),
  Message,
  Mount: [MountChart],
}) {}

export const SalesLive = Sales.make(
  Effect.fn(function* () {
    const chartLibrary = yield* ChartLibrary

    return {
      model: { monthlyTotals: [12, 19, 7, 24] },

      update: {
        SucceededMountChart: model => ({ model }),
        FailedMountChart: model => ({ model }),
      },

      mounts: {
        MountChart: ({ element, data }) =>
          Effect.acquireRelease(
            chartLibrary.load.pipe(
              Effect.map(library => library.create(element, data)),
            ),
            chart => Effect.sync(() => chart.destroy()),
          ).pipe(
            Effect.as(Message.SucceededMountChart()),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedMountChart({ reason: error.message }),
              ),
            ),
          ),
      },

      view: (model, h) =>
        h.div([
          h.Class('w-[480px] h-[320px]'),
          h.OnMount(MountChart({ data: model.monthlyTotals })),
        ]),
    }
  }),
)
