import { Effect } from 'effect'
import { Block } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { expect, it } from '@effect/vitest'
import { RadioGroup } from '@foldkit/ui'

import {
  FetchTelemetry,
  Message,
  SyncChart,
  TelemetryAsyncData,
} from './application'
import {
  type ChartMode,
  type PackageId,
  chartModes,
  packageIds,
} from './domain/telemetry'
import {
  application,
  loadingModel,
  readyModel,
  sampleTelemetry,
} from './model.fixture'
import { ApplicationLayer } from './services'
import { ChartModeRadioGroup, PackageRadioGroup } from './sidebar'

const selectedChartMode = (chartMode: ChartMode) =>
  Block.deliver(
    ChartModeRadioGroup,
    ['sidebar', 'chartModeRadioGroup'],
    ChartModeRadioGroup.Message.SelectedOption({
      index: chartModes.indexOf(chartMode),
      value: chartMode,
    }),
  )

const selectedPackage = (packageId: PackageId) =>
  Block.deliver(
    PackageRadioGroup,
    ['sidebar', 'packageRadioGroup'],
    PackageRadioGroup.Message.SelectedOption({
      index: packageIds.indexOf(packageId),
      value: packageId,
    }),
  )

const resolveChartModeFocus = Command.resolve(
  RadioGroup.test.FocusOption,
  ChartModeRadioGroup.Message.CompletedFocusOption(),
)

it.effect('mounting the chart syncs current telemetry into ECharts', () =>
  story(
    application,
    given(readyModel),
    message(Message.SucceededMountChart({ hostId: 'chart-host' })),
    Command.expectHas(SyncChart),
    Command.resolve(SyncChart, Message.SucceededSyncChart()),
  ).pipe(Effect.provide(ApplicationLayer)),
)

it.effect(
  'selecting a chart mode clears selected datum and syncs the chart',
  () =>
    story(
      application,
      given(readyModel),
      message(
        Message.ClickedChartDatum({ datumId: 'Velocity:Commits:2026-06-15' }),
      ),
      Command.resolve(SyncChart, Message.SucceededSyncChart()),
      message(selectedChartMode('Velocity')),
      resolveChartModeFocus,
      model(model => {
        expect(model.sidebar.chartMode).toBe('Velocity')
        expect(model.maybeSelectedDatumId._tag).toBe('None')
      }),
      Command.expectHas(SyncChart),
      Command.resolve(SyncChart, Message.SucceededSyncChart()),
    ).pipe(Effect.provide(ApplicationLayer)),
)

it.effect('selecting a package syncs the selected package into the chart', () =>
  story(
    application,
    given(readyModel),
    message(selectedPackage('Ui')),
    resolveChartModeFocus,
    model(model => {
      expect(model.sidebar.selectedPackageId).toBe('Ui')
    }),
    Command.expectHas(SyncChart),
    Command.resolve(SyncChart, Message.SucceededSyncChart()),
  ).pipe(Effect.provide(ApplicationLayer)),
)

it.effect('refreshing with data keeps the old dashboard while fetching', () =>
  story(
    application,
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
  ).pipe(Effect.provide(ApplicationLayer)),
)

it.effect('a failed refresh preserves stale data in the stale state', () =>
  story(
    application,
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
  ).pipe(Effect.provide(ApplicationLayer)),
)

it.effect(
  'failed fetch transitions to failure without stale data when loading',
  () =>
    story(
      application,
      given(loadingModel),
      message(Message.FailedFetchTelemetry({ error: 'offline' })),
      model(model => {
        expect(model.telemetry._tag).toBe('Failure')
        if (model.telemetry._tag === 'Failure') {
          expect(model.telemetry.error).toBe('offline')
        }
      }),
    ).pipe(Effect.provide(ApplicationLayer)),
)

it.effect('successful fetch stores data and syncs when mounted', () =>
  story(
    application,
    given(readyModel),
    message(Message.SucceededFetchTelemetry({ telemetry: sampleTelemetry })),
    model(model => {
      expect(model.telemetry._tag).toBe('Success')
    }),
    Command.expectHas(SyncChart),
    Command.resolve(SyncChart, Message.SucceededSyncChart()),
  ).pipe(Effect.provide(ApplicationLayer)),
)
