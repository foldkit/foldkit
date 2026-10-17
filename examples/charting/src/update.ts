import { Option, Result } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  ApplicationComposition,
  refetchTelemetry,
  syncChart,
} from './composition'
import { Message } from './message'
import { TelemetryAsyncData } from './model'

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedRefresh: () => refetchTelemetry(model),

    ClickedRetry: () => refetchTelemetry(model),

    ClickedChartDatum: ({ datumId }) => ({
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

    SucceededFetchTelemetry: ({ telemetry }) => {
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

    FailedFetchTelemetry: ({ error }) => ({
      model: modifyFields(model, {
        telemetry: () => AsyncData.settle(model.telemetry, Result.fail(error)),
      }),
    }),

    SucceededMountChart: ({ hostId }) => ({
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

    FailedMountChart: ({ reason }) => ({
      model: modifyFields(model, {
        maybeChartError: () => Option.some(reason),
      }),
    }),

    SucceededSyncChart: () => ({
      model: modifyFields(model, {
        maybeChartError: () => Option.none(),
      }),
    }),

    FailedSyncChart: ({ reason }) => ({
      model: modifyFields(model, {
        maybeChartError: () => Option.some(reason),
      }),
    }),
  }),
)
