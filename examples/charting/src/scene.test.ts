import { Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { RadioGroup } from '@foldkit/ui'

import { SyncChart } from './command'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { TelemetryAsyncData } from './model'
import { loadingModel, readyModel, sampleTelemetry } from './model.fixture'
import { CHART_HOST_ID, MountChart } from './mount'
import { ChartModeRadioGroupBlock } from './radioGroups'

const acknowledgeChartMount = Scene.Mount.resolve(
  MountChart,
  Message.SucceededMountChart({ hostId: CHART_HOST_ID }),
)

const acknowledgeChartSync = Scene.Command.resolve(
  SyncChart,
  Message.SucceededSyncChart(),
)

const resolveFocusOption = Scene.Command.resolve(
  RadioGroup.test.FocusOption,
  ChartModeRadioGroupBlock.Message.CompletedFocusOption(),
)

describe('view', () => {
  it.effect('loading view shows a telemetry progress state', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(loadingModel),
      Scene.expect(Scene.label('Loading telemetry')).toExist(),
    ),
  )

  it.effect('ready view shows summaries and chart controls', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(readyModel),
      acknowledgeChartMount,
      acknowledgeChartSync,
      Scene.expect(Scene.text('Foldkit Adoption Observatory')).toExist(),
      Scene.expect(Scene.text('Downloads')).toExist(),
      Scene.expect(Scene.role('radio', { name: 'Velocity' })).toExist(),
      Scene.expect(Scene.role('radio', { name: /@foldkit\/ui/ })).toExist(),
    ),
  )

  it.effect('clicking a chart mode updates the visible selected control', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(readyModel),
      acknowledgeChartMount,
      acknowledgeChartSync,
      Scene.click(Scene.role('radio', { name: 'Velocity' })),
      resolveFocusOption,
      Scene.Command.resolve(SyncChart, Message.SucceededSyncChart()),
      Scene.expect(Scene.role('radio', { name: 'Velocity' })).toHaveAttr(
        'aria-checked',
        'true',
      ),
    ),
  )

  it.effect('refreshing state keeps the dashboard visible', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
        modifyFields(readyModel, {
          telemetry: () =>
            TelemetryAsyncData.Refreshing({ data: sampleTelemetry }),
        }),
      ),
      acknowledgeChartMount,
      acknowledgeChartSync,
      Scene.expect(Scene.text('Refreshing public data')).toExist(),
      Scene.expect(Scene.text('Contributors')).toExist(),
    ),
  )

  it.effect('failure without stale data shows retry', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
        modifyFields(loadingModel, {
          telemetry: () => TelemetryAsyncData.Failure({ error: 'offline' }),
        }),
      ),
      Scene.expect(Scene.label('Telemetry failed')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Retry' })).toExist(),
    ),
  )
})
