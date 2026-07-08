import { Option } from 'effect'
import { Runtime } from 'foldkit'

import { FetchTelemetry } from './command'
import type { Message } from './message'
import { Model, TelemetryAsyncData } from './model'

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  {
    telemetry: TelemetryAsyncData.Loading(),
    chartMode: 'Adoption',
    selectedPackageId: 'Core',
    period: 'LastSixteenWeeks',
    maybeChartHostId: Option.none(),
    maybeChartError: Option.none(),
    maybeSelectedDatumId: Option.none(),
  },
  [FetchTelemetry()],
]
