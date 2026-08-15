import { Schema as S } from 'effect'
import { AsyncData } from 'foldkit'

import { RadioGroup } from '@foldkit/ui'

import { ChartMode, PackageId, Period, Telemetry } from './domain'

export const TelemetryAsyncData = AsyncData.Schema(Telemetry, S.String)

export const Model = S.Struct({
  telemetry: TelemetryAsyncData.schema,
  chartMode: ChartMode,
  chartModeRadioGroup: RadioGroup.Model,
  selectedPackageId: PackageId,
  packageRadioGroup: RadioGroup.Model,
  period: Period,
  periodRadioGroup: RadioGroup.Model,
  maybeChartHostId: S.Option(S.String),
  maybeChartError: S.Option(S.String),
  maybeSelectedDatumId: S.Option(S.String),
})
export type Model = typeof Model.Type
