import { Option } from 'effect'
import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { RadioGroup } from '@foldkit/ui'

import { SyncChart } from './command'
import { loadingModel, readyModel, sampleTelemetry } from './main.fixtures'
import {
  CompletedSyncChart,
  GotChartModeRadioGroupMessage,
  SucceededMountChart,
} from './message'
import { TelemetryFailure, TelemetryRefreshing } from './model'
import { update } from './update'
import { CHART_HOST_ID, MountChart } from './view/chart'
import { view } from './view/index'

const acknowledgeChartMount = Scene.Mount.resolve(
  MountChart,
  SucceededMountChart({ hostId: CHART_HOST_ID }),
)

const acknowledgeChartSync = Scene.Command.resolve(
  SyncChart,
  CompletedSyncChart(),
)

describe('view', () => {
  test('loading view shows a telemetry progress state', () => {
    Scene.scene(
      { update, view },
      Scene.with(loadingModel),
      Scene.expect(Scene.label('Loading telemetry')).toExist(),
    )
  })

  test('ready view shows summaries and chart controls', () => {
    Scene.scene(
      { update, view },
      Scene.with(readyModel),
      acknowledgeChartMount,
      acknowledgeChartSync,
      Scene.expect(Scene.text('Foldkit Adoption Observatory')).toExist(),
      Scene.expect(Scene.text('Downloads')).toExist(),
      Scene.expect(Scene.role('radio', { name: 'Velocity' })).toExist(),
      Scene.expect(Scene.role('radio', { name: /@foldkit\/ui/ })).toExist(),
    )
  })

  test('clicking a chart mode updates the visible selected control', () => {
    Scene.scene(
      { update, view },
      Scene.with(readyModel),
      acknowledgeChartMount,
      acknowledgeChartSync,
      Scene.click(Scene.role('radio', { name: 'Velocity' })),
      Scene.Command.resolve(
        RadioGroup.FocusOption,
        RadioGroup.CompletedFocusOption(),
        message => GotChartModeRadioGroupMessage({ message }),
      ),
      Scene.Command.resolve(SyncChart, CompletedSyncChart()),
      Scene.expect(Scene.role('radio', { name: 'Velocity' })).toHaveAttr(
        'aria-checked',
        'true',
      ),
    )
  })

  test('refreshing state keeps the dashboard visible', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...readyModel,
        telemetry: TelemetryRefreshing({ data: sampleTelemetry }),
      }),
      acknowledgeChartMount,
      acknowledgeChartSync,
      Scene.expect(Scene.text('Refreshing public data')).toExist(),
      Scene.expect(Scene.text('Contributors')).toExist(),
    )
  })

  test('failure without stale data shows retry', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...loadingModel,
        telemetry: TelemetryFailure({
          error: 'offline',
          maybeData: Option.none(),
        }),
      }),
      Scene.expect(Scene.label('Telemetry failed')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Retry' })).toExist(),
    )
  })
})
