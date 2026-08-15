import {
  Command,
  Mount,
  click,
  expect,
  given,
  label,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { RadioGroup } from '@foldkit/ui'

import { SyncChart } from './command'
import { loadingModel, readyModel, sampleTelemetry } from './main.fixtures'
import { SucceededMountChart, SucceededSyncChart } from './message'
import { TelemetryAsyncData } from './model'
import { update } from './update'
import { CHART_HOST_ID, MountChart } from './view/chart'
import { view } from './view/index'

const acknowledgeChartMount = Mount.resolve(
  MountChart,
  SucceededMountChart({ hostId: CHART_HOST_ID }),
)

const acknowledgeChartSync = Command.resolve(SyncChart, SucceededSyncChart())

const resolveFocusOption = Command.resolve(
  RadioGroup.FocusOption,
  RadioGroup.CompletedFocusOption(),
)

describe('view', () => {
  test('loading view shows a telemetry progress state', () => {
    scene(
      { update, view },
      given(loadingModel),
      expect(label('Loading telemetry')).toExist(),
    )
  })

  test('ready view shows summaries and chart controls', () => {
    scene(
      { update, view },
      given(readyModel),
      acknowledgeChartMount,
      acknowledgeChartSync,
      expect(text('Foldkit Adoption Observatory')).toExist(),
      expect(text('Downloads')).toExist(),
      expect(role('radio', { name: 'Velocity' })).toExist(),
      expect(role('radio', { name: /@foldkit\/ui/ })).toExist(),
    )
  })

  test('clicking a chart mode updates the visible selected control', () => {
    scene(
      { update, view },
      given(readyModel),
      acknowledgeChartMount,
      acknowledgeChartSync,
      click(role('radio', { name: 'Velocity' })),
      resolveFocusOption,
      Command.resolve(SyncChart, SucceededSyncChart()),
      expect(role('radio', { name: 'Velocity' })).toHaveAttr(
        'aria-checked',
        'true',
      ),
    )
  })

  test('refreshing state keeps the dashboard visible', () => {
    scene(
      { update, view },
      given({
        ...readyModel,
        telemetry: TelemetryAsyncData.Refreshing({ data: sampleTelemetry }),
      }),
      acknowledgeChartMount,
      acknowledgeChartSync,
      expect(text('Refreshing public data')).toExist(),
      expect(text('Contributors')).toExist(),
    )
  })

  test('failure without stale data shows retry', () => {
    scene(
      { update, view },
      given({
        ...loadingModel,
        telemetry: TelemetryAsyncData.Failure({ error: 'offline' }),
      }),
      expect(label('Telemetry failed')).toExist(),
      expect(role('button', { name: 'Retry' })).toExist(),
    )
  })
})
