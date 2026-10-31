import { Effect } from 'effect'
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
import { modifyFields } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'
import { RadioGroup } from '@foldkit/ui'

import {
  CHART_HOST_ID,
  Message,
  MountChart,
  SyncChart,
  TelemetryAsyncData,
} from './application'
import {
  application,
  loadingModel,
  readyModel,
  sampleTelemetry,
} from './model.fixture'
import { ApplicationLayer } from './services'
import { ChartModeRadioGroup } from './sidebar'

const acknowledgeChartMount = Mount.resolve(
  MountChart,
  Message.SucceededMountChart({ hostId: CHART_HOST_ID }),
)

const acknowledgeChartSync = Command.resolve(
  SyncChart,
  Message.SucceededSyncChart(),
)

const resolveFocusOption = Command.resolve(
  RadioGroup.test.FocusOption,
  ChartModeRadioGroup.Message.CompletedFocusOption(),
)

describe('view', () => {
  it.effect('loading view shows a telemetry progress state', () =>
    scene(
      application,
      given(loadingModel),
      expect(label('Loading telemetry')).toExist(),
    ).pipe(Effect.provide(ApplicationLayer)),
  )

  it.effect('ready view shows summaries and chart controls', () =>
    scene(
      application,
      given(readyModel),
      acknowledgeChartMount,
      acknowledgeChartSync,
      expect(text('Foldkit Adoption Observatory')).toExist(),
      expect(text('Downloads')).toExist(),
      expect(role('radio', { name: 'Velocity' })).toExist(),
      expect(role('radio', { name: /@foldkit\/ui/ })).toExist(),
    ).pipe(Effect.provide(ApplicationLayer)),
  )

  it.effect('clicking a chart mode updates the visible selected control', () =>
    scene(
      application,
      given(readyModel),
      acknowledgeChartMount,
      acknowledgeChartSync,
      click(role('radio', { name: 'Velocity' })),
      resolveFocusOption,
      Command.resolve(SyncChart, Message.SucceededSyncChart()),
      expect(role('radio', { name: 'Velocity' })).toHaveAttr(
        'aria-checked',
        'true',
      ),
    ).pipe(Effect.provide(ApplicationLayer)),
  )

  it.effect('refreshing state keeps the dashboard visible', () =>
    scene(
      application,
      given(
        modifyFields(readyModel, {
          telemetry: () =>
            TelemetryAsyncData.Refreshing({ data: sampleTelemetry }),
        }),
      ),
      acknowledgeChartMount,
      acknowledgeChartSync,
      expect(text('Refreshing public data')).toExist(),
      expect(text('Contributors')).toExist(),
    ).pipe(Effect.provide(ApplicationLayer)),
  )

  it.effect('failure without stale data shows retry', () =>
    scene(
      application,
      given(
        modifyFields(loadingModel, {
          telemetry: () => TelemetryAsyncData.Failure({ error: 'offline' }),
        }),
      ),
      expect(label('Telemetry failed')).toExist(),
      expect(role('button', { name: 'Retry' })).toExist(),
    ).pipe(Effect.provide(ApplicationLayer)),
  )
})
