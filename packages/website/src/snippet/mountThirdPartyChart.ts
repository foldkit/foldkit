import { Effect, Function, Schema as S } from 'effect'
import { Mount } from 'foldkit'
import { type Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

const h = html<Message>()

const SucceededMountChart = m('SucceededMountChart')
const FailedMountChart = m('FailedMountChart', { reason: S.String })

// Mount.define gives the action a name and constrains what Messages it can
// produce, plus an args record so the chart's per-instance data flows through
// declared values rather than a closure. The runtime invokes the bound
// factory on insert, dispatches the Message, and stashes the cleanup. When
// Snabbdom unmounts the element, OnMount calls the cleanup automatically.

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
        const { Chart } = yield* Effect.tryPromise(
          () => import('some-chart-library'),
        )
        const chart = new Chart(element, { data })
        return {
          message: SucceededMountChart(),
          cleanup: () => chart.destroy(),
        }
      }).pipe(
        Effect.catch(error =>
          Effect.succeed({
            message: FailedMountChart({
              reason: error instanceof Error ? error.message : String(error),
            }),
            cleanup: Function.constVoid,
          }),
        ),
      ),
)

const chartView = (data: ChartData): Html =>
  h.div([h.Class('w-[480px] h-[320px]'), h.OnMount(MountChart({ data }))], [])
