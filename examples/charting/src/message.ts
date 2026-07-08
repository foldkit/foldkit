import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import { ChartMode, PackageId, Period, Telemetry } from './domain'

export const SelectedChartMode = m('SelectedChartMode', {
  chartMode: ChartMode,
})
export const SelectedPackage = m('SelectedPackage', {
  packageId: PackageId,
})
export const SelectedPeriod = m('SelectedPeriod', {
  period: Period,
})
export const ClickedRefresh = m('ClickedRefresh')
export const ClickedRetry = m('ClickedRetry')
export const ClickedChartDatum = m('ClickedChartDatum', {
  datumId: S.String,
})
export const SucceededFetchTelemetry = m('SucceededFetchTelemetry', {
  telemetry: Telemetry,
})
export const FailedFetchTelemetry = m('FailedFetchTelemetry', {
  error: S.String,
})
export const SucceededMountChart = m('SucceededMountChart', {
  hostId: S.String,
})
export const FailedMountChart = m('FailedMountChart', { reason: S.String })
export const CompletedSyncChart = m('CompletedSyncChart')
export const FailedSyncChart = m('FailedSyncChart', { reason: S.String })

export const Message = S.Union([
  SelectedChartMode,
  SelectedPackage,
  SelectedPeriod,
  ClickedRefresh,
  ClickedRetry,
  ClickedChartDatum,
  SucceededFetchTelemetry,
  FailedFetchTelemetry,
  SucceededMountChart,
  FailedMountChart,
  CompletedSyncChart,
  FailedSyncChart,
])
export type Message = typeof Message.Type
