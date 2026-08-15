import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import { RadioGroup } from '@foldkit/ui'

import { Telemetry } from './domain'

export const GotChartModeRadioGroupMessage = m(
  'GotChartModeRadioGroupMessage',
  { message: RadioGroup.Message },
)
export const GotPackageRadioGroupMessage = m('GotPackageRadioGroupMessage', {
  message: RadioGroup.Message,
})
export const GotPeriodRadioGroupMessage = m('GotPeriodRadioGroupMessage', {
  message: RadioGroup.Message,
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
export const SucceededSyncChart = m('SucceededSyncChart')
export const FailedSyncChart = m('FailedSyncChart', { reason: S.String })

export const Message = S.Union([
  GotChartModeRadioGroupMessage,
  GotPackageRadioGroupMessage,
  GotPeriodRadioGroupMessage,
  ClickedRefresh,
  ClickedRetry,
  ClickedChartDatum,
  SucceededFetchTelemetry,
  FailedFetchTelemetry,
  SucceededMountChart,
  FailedMountChart,
  SucceededSyncChart,
  FailedSyncChart,
])
export type Message = typeof Message.Type
