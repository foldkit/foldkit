import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { RadioGroup } from '@foldkit/ui'

import { FetchTelemetry, SyncChart } from './command'
import {
  type ChartMode,
  type PackageId,
  chartModes,
  packageIds,
} from './domain'
import { loadingModel, readyModel, sampleTelemetry } from './main.fixtures'
import {
  ClickedChartDatum,
  ClickedRefresh,
  FailedFetchTelemetry,
  GotChartModeRadioGroupMessage,
  GotPackageRadioGroupMessage,
  SucceededFetchTelemetry,
  SucceededMountChart,
  SucceededSyncChart,
} from './message'
import { TelemetryAsyncData } from './model'
import { update } from './update'

const selectedChartMode = (chartMode: ChartMode) =>
  GotChartModeRadioGroupMessage({
    message: RadioGroup.SelectedOption({
      index: chartModes.indexOf(chartMode),
      value: chartMode,
    }),
  })

const selectedPackage = (packageId: PackageId) =>
  GotPackageRadioGroupMessage({
    message: RadioGroup.SelectedOption({
      index: packageIds.indexOf(packageId),
      value: packageId,
    }),
  })

const resolveChartModeFocus = Command.resolve(
  RadioGroup.FocusOption,
  RadioGroup.CompletedFocusOption(),
)

test('mounting the chart syncs current telemetry into ECharts', () => {
  story(
    update,
    given(readyModel),
    message(SucceededMountChart({ hostId: 'chart-host' })),
    Command.expectHas(SyncChart),
    Command.resolve(SyncChart, SucceededSyncChart()),
  )
})

test('selecting a chart mode clears selected datum and syncs the chart', () => {
  story(
    update,
    given(readyModel),
    message(ClickedChartDatum({ datumId: 'Velocity:Commits:2026-06-15' })),
    Command.resolve(SyncChart, SucceededSyncChart()),
    message(selectedChartMode('Velocity')),
    resolveChartModeFocus,
    model(model => {
      expect(model.chartMode).toBe('Velocity')
      expect(model.maybeSelectedDatumId._tag).toBe('None')
    }),
    Command.expectHas(SyncChart),
    Command.resolve(SyncChart, SucceededSyncChart()),
  )
})

test('selecting a package syncs the selected package into the chart', () => {
  story(
    update,
    given(readyModel),
    message(selectedPackage('Ui')),
    resolveChartModeFocus,
    model(model => {
      expect(model.selectedPackageId).toBe('Ui')
    }),
    Command.expectHas(SyncChart),
    Command.resolve(SyncChart, SucceededSyncChart()),
  )
})

test('refreshing with data keeps the old dashboard while fetching', () => {
  story(
    update,
    given(readyModel),
    message(ClickedRefresh()),
    model(model => {
      expect(model.telemetry._tag).toBe('Refreshing')
      if (model.telemetry._tag === 'Refreshing') {
        expect(model.telemetry.data.repository.stars).toBe(342)
      }
    }),
    Command.expectHas(FetchTelemetry),
    Command.resolve(
      FetchTelemetry,
      FailedFetchTelemetry({ error: 'Test cleanup' }),
    ),
  )
})

test('a failed refresh preserves stale data in the stale state', () => {
  story(
    update,
    given({
      ...readyModel,
      telemetry: TelemetryAsyncData.Refreshing({ data: sampleTelemetry }),
    }),
    message(FailedFetchTelemetry({ error: 'rate limited' })),
    model(model => {
      expect(model.telemetry._tag).toBe('Stale')
      if (model.telemetry._tag === 'Stale') {
        expect(model.telemetry.error).toBe('rate limited')
        expect(model.telemetry.data.repository.stars).toBe(342)
      }
    }),
  )
})

test('failed fetch transitions to failure without stale data when loading', () => {
  story(
    update,
    given(loadingModel),
    message(FailedFetchTelemetry({ error: 'offline' })),
    model(model => {
      expect(model.telemetry._tag).toBe('Failure')
      if (model.telemetry._tag === 'Failure') {
        expect(model.telemetry.error).toBe('offline')
      }
    }),
  )
})

test('successful fetch stores data and syncs when mounted', () => {
  story(
    update,
    given(readyModel),
    message(SucceededFetchTelemetry({ telemetry: sampleTelemetry })),
    model(model => {
      expect(model.telemetry._tag).toBe('Success')
    }),
    Command.expectHas(SyncChart),
    Command.resolve(SyncChart, SucceededSyncChart()),
  )
})
