import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { it } from '@effect/vitest'
import { RadioGroup } from '@foldkit/ui'

import { FetchTelemetry, SyncChart } from './command'
import {
  ChartModeRadioGroupBinding,
  PackageRadioGroupBinding,
} from './composition'
import {
  type ChartMode,
  type PackageId,
  chartModes,
  packageIds,
} from './domain'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { TelemetryAsyncData } from './model'
import { loadingModel, readyModel, sampleTelemetry } from './model.fixture'
import { ChartModeRadioGroupBlock, PackageRadioGroupBlock } from './radioGroups'

const selectedChartMode = (chartMode: ChartMode) =>
  Story.messageIn(
    ChartModeRadioGroupBinding,
    ChartModeRadioGroupBlock.Message.SelectedOption({
      index: chartModes.indexOf(chartMode),
      value: chartMode,
    }),
  )

const selectedPackage = (packageId: PackageId) =>
  Story.messageIn(
    PackageRadioGroupBinding,
    PackageRadioGroupBlock.Message.SelectedOption({
      index: packageIds.indexOf(packageId),
      value: packageId,
    }),
  )

const resolveChartModeFocus = Story.Command.resolve(
  RadioGroup.test.FocusOption,
  ChartModeRadioGroupBlock.Message.CompletedFocusOption(),
)

it.effect('mounting the chart syncs current telemetry into ECharts', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(readyModel),
    Story.message(Message.SucceededMountChart({ hostId: 'chart-host' })),
    Story.Command.expectHas(SyncChart),
    Story.Command.resolve(SyncChart, Message.SucceededSyncChart()),
  ),
)

it.effect(
  'selecting a chart mode clears selected datum and syncs the chart',
  () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(readyModel),
      Story.message(
        Message.ClickedChartDatum({ datumId: 'Velocity:Commits:2026-06-15' }),
      ),
      Story.Command.resolve(SyncChart, Message.SucceededSyncChart()),
      selectedChartMode('Velocity'),
      resolveChartModeFocus,
      Story.model(model => {
        expect(model.chartMode).toBe('Velocity')
        expect(model.maybeSelectedDatumId._tag).toBe('None')
      }),
      Story.Command.expectHas(SyncChart),
      Story.Command.resolve(SyncChart, Message.SucceededSyncChart()),
    ),
)

it.effect('selecting a package syncs the selected package into the chart', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(readyModel),
    selectedPackage('Ui'),
    resolveChartModeFocus,
    Story.model(model => {
      expect(model.selectedPackageId).toBe('Ui')
    }),
    Story.Command.expectHas(SyncChart),
    Story.Command.resolve(SyncChart, Message.SucceededSyncChart()),
  ),
)

it.effect('refreshing with data keeps the old dashboard while fetching', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(readyModel),
    Story.message(Message.ClickedRefresh()),
    Story.model(model => {
      expect(model.telemetry._tag).toBe('Refreshing')
      if (model.telemetry._tag === 'Refreshing') {
        expect(model.telemetry.data.repository.stars).toBe(342)
      }
    }),
    Story.Command.expectHas(FetchTelemetry),
    Story.Command.resolve(
      FetchTelemetry,
      Message.FailedFetchTelemetry({ error: 'Test cleanup' }),
    ),
  ),
)

it.effect('a failed refresh preserves stale data in the stale state', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(
      modifyFields(readyModel, {
        telemetry: () =>
          TelemetryAsyncData.Refreshing({ data: sampleTelemetry }),
      }),
    ),
    Story.message(Message.FailedFetchTelemetry({ error: 'rate limited' })),
    Story.model(model => {
      expect(model.telemetry._tag).toBe('Stale')
      if (model.telemetry._tag === 'Stale') {
        expect(model.telemetry.error).toBe('rate limited')
        expect(model.telemetry.data.repository.stars).toBe(342)
      }
    }),
  ),
)

it.effect(
  'failed fetch transitions to failure without stale data when loading',
  () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(loadingModel),
      Story.message(Message.FailedFetchTelemetry({ error: 'offline' })),
      Story.model(model => {
        expect(model.telemetry._tag).toBe('Failure')
        if (model.telemetry._tag === 'Failure') {
          expect(model.telemetry.error).toBe('offline')
        }
      }),
    ),
)

it.effect('successful fetch stores data and syncs when mounted', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(readyModel),
    Story.message(
      Message.SucceededFetchTelemetry({ telemetry: sampleTelemetry }),
    ),
    Story.model(model => {
      expect(model.telemetry._tag).toBe('Success')
    }),
    Story.Command.expectHas(SyncChart),
    Story.Command.resolve(SyncChart, Message.SucceededSyncChart()),
  ),
)

it.effect('seeds loading state and queues a telemetry fetch', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.init(),
    Story.model(model => {
      expect(model.telemetry._tag).toBe('Loading')
    }),
    Story.Command.expectHas(FetchTelemetry),
    Story.Command.resolve(
      FetchTelemetry,
      Message.SucceededFetchTelemetry({ telemetry: sampleTelemetry }),
    ),
  ),
)
