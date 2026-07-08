import { Schema as S } from 'effect'
import { AsyncData } from 'foldkit'

import { RadioGroup } from '@foldkit/ui'

import { ChartMode, PackageId, Period, Telemetry } from './domain'

export const TelemetryAsyncData = AsyncData.Schema(Telemetry, S.String)

export const Model = S.Struct({
  telemetry: TelemetryAsyncData.schema,
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
