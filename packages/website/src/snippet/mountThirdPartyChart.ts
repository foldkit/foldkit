import { Effect, Queue, Schema as S, Stream } from 'effect'
import { Mount } from 'foldkit'
import { type Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

const h = html<Message>()

const SucceededMountChart = m('SucceededMountChart')
const FailedMountChart = m('FailedMountChart', { reason: S.String })

// Mount.define gives the action a name and constrains what Messages it can
// produce, plus an args record so the chart's per-instance data flows through
// declared values rather than a closure. The runtime invokes the bound factory
// on insert, runs the Stream until the element unmounts, dispatches each
// emitted Message, and closes the stream's scope on destroy (firing any
// acquireRelease finalizers).

const ChartData = S.Array(S.Number)
type ChartData = typeof ChartData.Type

const MountChart = Mount.define(
  'MountChart',
  { data: ChartData },
  SucceededMountChart,
  FailedMountChart,
)(
  ({ data }) =>
    element =>
      Stream.callback<
        typeof SucceededMountChart.Type | typeof FailedMountChart.Type
      >(queue =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.gen(function* () {
              const { Chart } = yield* Effect.tryPromise(
                () => import('some-chart-library'),
              )
              const chart = new Chart(element, { data })
              Queue.offerUnsafe(queue, SucceededMountChart())
              return chart
            }).pipe(
              Effect.catch(error =>
                Effect.gen(function* () {
                  Queue.offerUnsafe(
                    queue,
                    FailedMountChart({
                      reason:
                        error instanceof Error ? error.message : String(error),
                    }),
                  )
                  return null
                }),
              ),
            ),
            chart => Effect.sync(() => chart?.destroy()),
          )
          return yield* Effect.never
        }),
      ),
)

const chartView = (data: ChartData): Html =>
  h.div([h.Class('w-[480px] h-[320px]'), h.OnMount(MountChart({ data }))], [])
