import { Effect, Schema as S } from 'effect'
import { Mount } from 'foldkit'
import { type Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

const SucceededMountChart = m('SucceededMountChart')
const FailedMountChart = m('FailedMountChart', { reason: S.String })

// Mount.define gives the action a name and constrains what Messages it can
// produce, plus an args record so the chart's per-instance data flows through
// declared values rather than a closure. The runtime invokes the bound factory
// on insert, runs the Effect to produce one Message, dispatches it, and closes
// the scope on destroy (firing any acquireRelease finalizers).

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
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.tryPromise(() => import('some-chart-library')).pipe(
            Effect.map(({ Chart }) => new Chart(element, { data })),
          ),
          chart => Effect.sync(() => chart.destroy()),
        )
        return SucceededMountChart()
      }).pipe(
        Effect.catch(error =>
          Effect.succeed(
            FailedMountChart({
              reason: error instanceof Error ? error.message : String(error),
            }),
          ),
        ),
      ),
)

const chartView = (data: ChartData): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('w-[480px] h-[320px]'), h.OnMount(MountChart({ data }))],
    [],
  )
}
