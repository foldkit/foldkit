import { Effect, Schema as S } from 'effect'
import type { Html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Class, OnDestroy, OnInsertEffect, div } from '../html'

const MountedChart = m('MountedChart')
const FailedMountChart = m('FailedMountChart', { reason: S.String })

// The third-party library owns its DOM subtree. We dynamically import
// it on mount, attach it to the element Foldkit gives us, and stash
// the teardown function so OnDestroy can find it on unmount.
const cleanupByElement = new WeakMap<Element, () => void>()

const mountChart =
  (data: ChartData) =>
  (element: Element): Effect.Effect<Message> =>
    Effect.tryPromise(() => import('some-chart-library')).pipe(
      Effect.map(({ Chart }) => {
        const chart = new Chart(element, { data })
        cleanupByElement.set(element, () => chart.destroy())
        return MountedChart()
      }),
      Effect.catchAll(error =>
        Effect.succeed(
          FailedMountChart({
            reason: error instanceof Error ? error.message : String(error),
          }),
        ),
      ),
    )

const teardownChart = (element: Element): void => {
  const maybeCleanup = cleanupByElement.get(element)
  if (maybeCleanup) {
    maybeCleanup()
    cleanupByElement.delete(element)
  }
}

const chartView = (data: ChartData): Html =>
  div(
    [
      Class('w-[480px] h-[320px]'),
      OnInsertEffect(mountChart(data)),
      OnDestroy(teardownChart),
    ],
    [],
  )
