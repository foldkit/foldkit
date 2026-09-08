import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { RadioGroup } from '@foldkit/ui'

import { Telemetry } from './domain'

export const Message = defineMessageUnion({
  GotChartModeRadioGroupMessage: { message: RadioGroup.Message },
  GotPackageRadioGroupMessage: { message: RadioGroup.Message },
  GotPeriodRadioGroupMessage: { message: RadioGroup.Message },
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
