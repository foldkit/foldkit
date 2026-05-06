import { Effect, Function, Schema as S } from 'effect'
import { Mount } from 'foldkit'
import type { Html, MountResult } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Class, OnMount, div } from '../html'

const SucceededMountChart = m('SucceededMountChart')
const FailedMountChart = m('FailedMountChart', { reason: S.String })

// Mount.define gives the action a name and constrains what Messages it can
// produce. The runtime invokes the wrapped function on insert, dispatches the
// Message, and stashes the cleanup. When Snabbdom unmounts the element,
// OnMount calls the cleanup automatically.

const MountChart = Mount.define(
  'MountChart',
  SucceededMountChart,
  FailedMountChart,
)

const mountChart = (data: ChartData) =>
  MountChart(
    (element: Element): Effect.Effect<MountResult<Message>> =>
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
  div([Class('w-[480px] h-[320px]'), OnMount(mountChart(data))], [])
