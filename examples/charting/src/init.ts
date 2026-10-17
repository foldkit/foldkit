import { Option } from 'effect'

import { FetchTelemetry } from './command'
import { ApplicationComposition } from './composition'
import { TelemetryAsyncData } from './model'

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    telemetry: TelemetryAsyncData.Loading(),
    chartMode: 'Adoption',
    selectedPackageId: 'Core',
    period: 'LastSixteenWeeks',
    maybeChartHostId: Option.none(),
    maybeChartError: Option.none(),
    maybeSelectedDatumId: Option.none(),
  },
  commands: [FetchTelemetry()],
}))
