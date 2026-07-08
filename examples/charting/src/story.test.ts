import { Story } from 'foldkit'
import { expect, test } from 'vitest'

import { FetchTelemetry, SyncChart } from './command'
import { loadingModel, readyModel, sampleTelemetry } from './main.fixtures'
import {
  ClickedChartDatum,
  ClickedRefresh,
  CompletedSyncChart,
  FailedFetchTelemetry,
  SelectedChartMode,
  SelectedPackage,
  SucceededFetchTelemetry,
  SucceededMountChart,
} from './message'
import { TelemetryAsyncData } from './model'
import { update } from './update'

test('mounting the chart syncs current telemetry into ECharts', () => {
  Story.story(
    update,
    Story.with(readyModel),
    Story.message(SucceededMountChart({ hostId: 'chart-host' })),
    Story.Command.expectHas(SyncChart),
    Story.Command.resolve(SyncChart, CompletedSyncChart()),
  )
})

test('selecting a chart mode clears selected datum and syncs the chart', () => {
  Story.story(
    update,
    Story.with(readyModel),
    Story.message(
      ClickedChartDatum({ datumId: 'Velocity:Commits:2026-06-15' }),
    ),
    Story.Command.resolve(SyncChart, CompletedSyncChart()),
    Story.message(SelectedChartMode({ chartMode: 'Velocity' })),
    Story.model(model => {
      expect(model.chartMode).toBe('Velocity')
      expect(model.maybeSelectedDatumId._tag).toBe('None')
    }),
    Story.Command.expectHas(SyncChart),
    Story.Command.resolve(SyncChart, CompletedSyncChart()),
  )
})

test('selecting a package syncs the selected package into the chart', () => {
  Story.story(
    update,
    Story.with(readyModel),
    Story.message(SelectedPackage({ packageId: 'Ui' })),
    Story.model(model => {
      expect(model.selectedPackageId).toBe('Ui')
    }),
    Story.Command.expectHas(SyncChart),
    Story.Command.resolve(SyncChart, CompletedSyncChart()),
  )
})

test('refreshing with data keeps the old dashboard while fetching', () => {
  Story.story(
    update,
    Story.with(readyModel),
    Story.message(ClickedRefresh()),
    Story.model(model => {
      expect(model.telemetry._tag).toBe('Refreshing')
      if (model.telemetry._tag === 'Refreshing') {
        expect(model.telemetry.data.repository.stars).toBe(342)
      }
    }),
    Story.Command.expectHas(FetchTelemetry),
    Story.Command.resolve(
      FetchTelemetry,
      FailedFetchTelemetry({ error: 'Test cleanup' }),
    ),
  )
})

test('a failed refresh preserves stale data in the stale state', () => {
  Story.story(
    update,
    Story.with({
      ...readyModel,
      telemetry: TelemetryAsyncData.Refreshing({ data: sampleTelemetry }),
    }),
    Story.message(FailedFetchTelemetry({ error: 'rate limited' })),
    Story.model(model => {
      expect(model.telemetry._tag).toBe('Stale')
      if (model.telemetry._tag === 'Stale') {
        expect(model.telemetry.error).toBe('rate limited')
        expect(model.telemetry.data.repository.stars).toBe(342)
      }
    }),
  )
})

test('failed fetch transitions to failure without stale data when loading', () => {
  Story.story(
    update,
    Story.with(loadingModel),
    Story.message(FailedFetchTelemetry({ error: 'offline' })),
    Story.model(model => {
      expect(model.telemetry._tag).toBe('Failure')
      if (model.telemetry._tag === 'Failure') {
        expect(model.telemetry.error).toBe('offline')
      }
    }),
  )
})

test('successful fetch stores data and syncs when mounted', () => {
  Story.story(
    update,
    Story.with(readyModel),
    Story.message(SucceededFetchTelemetry({ telemetry: sampleTelemetry })),
    Story.model(model => {
      expect(model.telemetry._tag).toBe('Success')
    }),
    Story.Command.expectHas(SyncChart),
    Story.Command.resolve(SyncChart, CompletedSyncChart()),
  )
})
