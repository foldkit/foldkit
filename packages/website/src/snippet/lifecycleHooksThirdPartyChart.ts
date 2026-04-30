import { Effect, Schema as S } from 'effect'
import type { Html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Class, OnMount, div } from '../html'

const MountedChart = m('MountedChart')
const FailedMountChart = m('FailedMountChart', { reason: S.String })

// OnMount runs the Effect on insert, dispatches the Message, and stores
// the cleanup. When Snabbdom unmounts the element, OnMount calls the
// cleanup automatically. No WeakMap, no paired OnDestroy hook.

const mountChart =
  (data: ChartData) =>
  (element: Element): Effect.Effect<Mount<Message>> =>
    Effect.tryPromise(() => import('some-chart-library')).pipe(
      Effect.map(({ Chart }) => {
        const chart = new Chart(element, { data })
        return {
          message: MountedChart(),
          cleanup: () => chart.destroy(),
        }
      }),
      Effect.catchAll(error =>
        Effect.succeed({
          message: FailedMountChart({
            reason: error instanceof Error ? error.message : String(error),
          }),
          cleanup: () => {},
        }),
      ),
    )

const chartView = (data: ChartData): Html =>
  div([Class('w-[480px] h-[320px]'), OnMount(mountChart(data))], [])
