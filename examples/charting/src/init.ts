import { Option } from 'effect'
import { Runtime } from 'foldkit'

import { RadioGroup } from '@foldkit/ui'

import { FetchTelemetry } from './command'
import type { Message } from './message'
import { Model, TelemetryLoading } from './model'

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  {
    telemetry: TelemetryLoading(),
    chartMode: 'Adoption',
    selectedPackageId: 'Core',
    period: 'LastSixteenWeeks',
    maybeChartHostId: Option.none(),
    maybeChartError: Option.none(),
    maybeSelectedDatumId: Option.none(),
    chartModeRadioGroup: RadioGroup.init({
      id: 'chart-mode',
      selectedValue: 'Adoption',
      orientation: 'Horizontal',
    }),
    packageIdRadioGroup: RadioGroup.init({
      id: 'package',
      selectedValue: 'Core',
      orientation: 'Vertical',
    }),
    periodRadioGroup: RadioGroup.init({
      id: 'period',
      selectedValue: 'LastSixteenWeeks',
      orientation: 'Horizontal',
    }),
  },
  [FetchTelemetry()],
]
