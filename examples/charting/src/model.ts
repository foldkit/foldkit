import { Schema } from 'effect'
import { AsyncData } from 'foldkit'

import { ChartMode, PackageId, Period, Telemetry } from './domain'
import {
  ChartModeRadioGroup,
  PackageRadioGroup,
  PeriodRadioGroup,
} from './radioGroups'

export const TelemetryAsyncData = AsyncData.Schema(Telemetry, Schema.String)

export const Model = Schema.Struct({
  telemetry: TelemetryAsyncData.schema,
  chartMode: ChartMode,
  chartModeRadioGroup: ChartModeRadioGroup.Model,
  selectedPackageId: PackageId,
  packageRadioGroup: PackageRadioGroup.Model,
  period: Period,
  periodRadioGroup: PeriodRadioGroup.Model,
  maybeChartHostId: Schema.Option(Schema.String),
  maybeChartError: Schema.Option(Schema.String),
  maybeSelectedDatumId: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type
