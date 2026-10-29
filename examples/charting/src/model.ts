import { Schema } from 'effect'
import { AsyncData } from 'foldkit'

import { ChartMode, PackageId, Period, Telemetry } from './domain'
import {
  ChartModeRadioGroupBlock,
  PackageRadioGroupBlock,
  PeriodRadioGroupBlock,
} from './radioGroups'

export const TelemetryAsyncData = AsyncData.Schema(Telemetry, Schema.String)

export const Model = Schema.Struct({
  telemetry: TelemetryAsyncData.schema,
  chartMode: ChartMode,
  chartModeRadioGroup: ChartModeRadioGroupBlock.Model,
  selectedPackageId: PackageId,
  packageRadioGroup: PackageRadioGroupBlock.Model,
  period: Period,
  periodRadioGroup: PeriodRadioGroupBlock.Model,
  maybeChartHostId: Schema.Option(Schema.String),
  maybeChartError: Schema.Option(Schema.String),
  maybeSelectedDatumId: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type
