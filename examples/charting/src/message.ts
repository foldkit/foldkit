import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Telemetry } from './domain'
import {
  ChartModeRadioGroup,
  PackageRadioGroup,
  PeriodRadioGroup,
} from './radioGroups'

export const Message = defineMessageUnion({
  GotChartModeRadioGroupMessage: { message: ChartModeRadioGroup.Message },
  GotPackageRadioGroupMessage: { message: PackageRadioGroup.Message },
  GotPeriodRadioGroupMessage: { message: PeriodRadioGroup.Message },
  ClickedRefresh: {},
  ClickedRetry: {},
  ClickedChartDatum: { datumId: Schema.String },
  SucceededFetchTelemetry: { telemetry: Telemetry },
  FailedFetchTelemetry: { error: Schema.String },
  SucceededMountChart: { hostId: Schema.String },
  FailedMountChart: { reason: Schema.String },
  SucceededSyncChart: {},
  FailedSyncChart: { reason: Schema.String },
})

export type Message = typeof Message.Type
