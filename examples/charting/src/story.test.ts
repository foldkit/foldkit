import { Command, given, message, model, story } from 'foldkit/story'
import { messageFrom } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { it } from '@effect/vitest'
import { test as RadioGroupTest } from '@foldkit/ui/radioGroup'

import { ApplicationBlock, layer } from './block'
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
import { Message } from './message'
import { TelemetryAsyncData } from './model'
import { loadingModel, readyModel, sampleTelemetry } from './model.fixture'
import { ChartModeRadioGroupBlock, PackageRadioGroupBlock } from './radioGroups'

const selectedChartMode = (chartMode: ChartMode) =>
  messageFrom(
    ChartModeRadioGroupBinding,
    ChartModeRadioGroupBlock.Message.SelectedOption({
      index: chartModes.indexOf(chartMode),
      value: chartMode,
    }),
  )

const selectedPackage = (packageId: PackageId) =>
  messageFrom(
    PackageRadioGroupBinding,
    PackageRadioGroupBlock.Message.SelectedOption({
      index: packageIds.indexOf(packageId),
      value: packageId,
    }),
  )

const resolveChartModeFocus = Command.resolve(
  RadioGroupTest.FocusOption,
  ChartModeRadioGroupBlock.Message.CompletedFocusOption(),
)

it.effect('mounting the chart syncs current telemetry into ECharts', () =>
  story(
    { block: ApplicationBlock, layer },
    given(readyModel),
    message(Message.SucceededMountChart({ hostId: 'chart-host' })),
    Command.expectHas(SyncChart),
    Command.resolve(SyncChart, Message.SucceededSyncChart()),
  ),
)

it.effect(
  'selecting a chart mode clears selected datum and syncs the chart',
  () =>
    story(
      { block: ApplicationBlock, layer },
      given(readyModel),
      message(
        Message.ClickedChartDatum({ datumId: 'Velocity:Commits:2026-06-15' }),
      ),
      Command.resolve(SyncChart, Message.SucceededSyncChart()),
      selectedChartMode('Velocity'),
      resolveChartModeFocus,
      model(model => {
        expect(model.chartMode).toBe('Velocity')
        expect(model.maybeSelectedDatumId._tag).toBe('None')
      }),
      Command.expectHas(SyncChart),
      Command.resolve(SyncChart, Message.SucceededSyncChart()),
    ),
)

it.effect('selecting a package syncs the selected package into the chart', () =>
  story(
    { block: ApplicationBlock, layer },
    given(readyModel),
    selectedPackage('Ui'),
    resolveChartModeFocus,
    model(model => {
      expect(model.selectedPackageId).toBe('Ui')
    }),
    Command.expectHas(SyncChart),
    Command.resolve(SyncChart, Message.SucceededSyncChart()),
  ),
)

it.effect('refreshing with data keeps the old dashboard while fetching', () =>
  story(
    { block: ApplicationBlock, layer },
    given(readyModel),
    message(Message.ClickedRefresh()),
    model(model => {
      expect(model.telemetry._tag).toBe('Refreshing')
      if (model.telemetry._tag === 'Refreshing') {
        expect(model.telemetry.data.repository.stars).toBe(342)
      }
    }),
    Command.expectHas(FetchTelemetry),
    Command.resolve(
      FetchTelemetry,
      Message.FailedFetchTelemetry({ error: 'Test cleanup' }),
    ),
  ),
)

it.effect('a failed refresh preserves stale data in the stale state', () =>
  story(
    { block: ApplicationBlock, layer },
    given(
      modifyFields(readyModel, {
        telemetry: () =>
          TelemetryAsyncData.Refreshing({ data: sampleTelemetry }),
      }),
    ),
    message(Message.FailedFetchTelemetry({ error: 'rate limited' })),
    model(model => {
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
    story(
      { block: ApplicationBlock, layer },
      given(loadingModel),
      message(Message.FailedFetchTelemetry({ error: 'offline' })),
      model(model => {
        expect(model.telemetry._tag).toBe('Failure')
        if (model.telemetry._tag === 'Failure') {
          expect(model.telemetry.error).toBe('offline')
        }
      }),
    ),
)

it.effect('successful fetch stores data and syncs when mounted', () =>
  story(
    { block: ApplicationBlock, layer },
    given(readyModel),
    message(Message.SucceededFetchTelemetry({ telemetry: sampleTelemetry })),
    model(model => {
      expect(model.telemetry._tag).toBe('Success')
    }),
    Command.expectHas(SyncChart),
    Command.resolve(SyncChart, Message.SucceededSyncChart()),
  ),
)
