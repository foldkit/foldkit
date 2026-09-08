import { Schema } from 'effect'
import { AsyncData } from 'foldkit'

import { RadioGroup } from '@foldkit/ui'

import { ChartMode, PackageId, Period, Telemetry } from './domain'

export const TelemetryAsyncData = AsyncData.Schema(Telemetry, Schema.String)

export const Model = Schema.Struct({
  telemetry: TelemetryAsyncData.schema,
  chartMode: ChartMode,
  chartModeRadioGroup: RadioGroup.Model,
  selectedPackageId: PackageId,
  packageRadioGroup: RadioGroup.Model,
  period: Period,
  periodRadioGroup: RadioGroup.Model,
  maybeChartHostId: Schema.Option(Schema.String),
  maybeChartError: Schema.Option(Schema.String),
  maybeSelectedDatumId: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type
