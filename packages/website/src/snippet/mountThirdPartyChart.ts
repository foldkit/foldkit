import { Effect, Schema } from 'effect'
import { Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  SucceededMountChart: {},
  FailedMountChart: { reason: Schema.String },
})

// Mount.define gives the action a name and constrains what Messages it can
// produce, plus an args record so the chart's per-instance data flows through
// declared values rather than a closure. The runtime calls execute with the
// live element on insert, runs the Effect to produce one Message, dispatches
// it, and closes the scope on destroy (firing any acquireRelease finalizers).

const ChartData = Schema.Array(Schema.Number)
type ChartData = typeof ChartData.Type

const MountChart = Mount.define('MountChart', {
  args: { data: ChartData },
  messages: [Message.SucceededMountChart, Message.FailedMountChart],
  execute: ({ element, data }) =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.tryPromise(() => import('some-chart-library')).pipe(
          Effect.map(({ Chart }) => new Chart(element, { data })),
        ),
        chart => Effect.sync(() => chart.destroy()),
      )
      return Message.SucceededMountChart()
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedMountChart({
            reason: error instanceof Error ? error.message : String(error),
          }),
        ),
      ),
    ),
})

const chartView = (data: ChartData, h: HtmlBuilder<Message>): Html =>
  h.div([h.Class('w-[480px] h-[320px]'), h.OnMount(MountChart({ data }))])
