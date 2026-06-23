import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import { RadioGroup } from '@foldkit/ui'

import { ChartMode, PackageId, Period, Telemetry } from './domain'

export const TelemetryNotAsked = ts('TelemetryNotAsked')
export const TelemetryLoading = ts('TelemetryLoading')
export const TelemetryRefreshing = ts('TelemetryRefreshing', {
  data: Telemetry,
})
export const TelemetryFailure = ts('TelemetryFailure', {
  error: S.String,
  maybeData: S.Option(Telemetry),
})
export const TelemetryOk = ts('TelemetryOk', { data: Telemetry })

export const TelemetryState = S.Union([
  TelemetryNotAsked,
  TelemetryLoading,
  TelemetryRefreshing,
  TelemetryFailure,
  TelemetryOk,
])
export type TelemetryState = typeof TelemetryState.Type

export const Model = S.Struct({
  telemetry: TelemetryState,
  chartMode: ChartMode,
  selectedPackageId: PackageId,
  period: Period,
  maybeChartHostId: S.Option(S.String),
  maybeChartError: S.Option(S.String),
  maybeSelectedDatumId: S.Option(S.String),
  chartModeRadioGroup: RadioGroup.Model,
  packageIdRadioGroup: RadioGroup.Model,
  periodRadioGroup: RadioGroup.Model,
})
export type Model = typeof Model.Type
