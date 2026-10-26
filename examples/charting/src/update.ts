import { Option, Result } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  ApplicationComposition,
  refetchTelemetry,
  syncChart,
} from './composition'
import { makeFieldsStep } from './definition'
import { TelemetryAsyncData } from './model'

export const update = ApplicationComposition.makeUpdate({
  ClickedRefresh: model => refetchTelemetry(model),

  ClickedRetry: model => refetchTelemetry(model),

  ClickedChartDatum: (model, { datumId }) => ({
    model: modifyFields(model, {
      maybeSelectedDatumId: () => Option.some(datumId),
    }),
    commands: syncChart({
      maybeChartHostId: model.maybeChartHostId,
      telemetry: model.telemetry,
      chartMode: model.chartMode,
      selectedPackageId: model.selectedPackageId,
      period: model.period,
      maybeSelectedDatumId: Option.some(datumId),
    }),
  }),

  SucceededFetchTelemetry: (model, { telemetry }) => {
    const nextModel = modifyFields(model, {
      telemetry: () => TelemetryAsyncData.Success({ data: telemetry }),
    })
    return {
      model: nextModel,
      commands: syncChart({
        maybeChartHostId: nextModel.maybeChartHostId,
        telemetry: nextModel.telemetry,
        chartMode: nextModel.chartMode,
        selectedPackageId: nextModel.selectedPackageId,
        period: nextModel.period,
        maybeSelectedDatumId: nextModel.maybeSelectedDatumId,
      }),
    }
  },

  FailedFetchTelemetry: makeFieldsStep((model, { error }) => ({
    telemetry: () => AsyncData.settle(model.telemetry, Result.fail(error)),
  })),

  SucceededMountChart: (model, { hostId }) => ({
    model: modifyFields(model, {
      maybeChartHostId: () => Option.some(hostId),
      maybeChartError: () => Option.none(),
    }),
    commands: syncChart({
      maybeChartHostId: Option.some(hostId),
      telemetry: model.telemetry,
      chartMode: model.chartMode,
      selectedPackageId: model.selectedPackageId,
      period: model.period,
      maybeSelectedDatumId: model.maybeSelectedDatumId,
    }),
  }),

  FailedMountChart: makeFieldsStep.fromMessage(({ reason }) => ({
    maybeChartError: () => Option.some(reason),
  })),

  SucceededSyncChart: makeFieldsStep(() => ({
    maybeChartError: () => Option.none(),
  })),

  FailedSyncChart: makeFieldsStep.fromMessage(({ reason }) => ({
    maybeChartError: () => Option.some(reason),
  })),
})
