import { Option } from 'effect'
import { Runtime } from 'foldkit'

import { RadioGroup } from '@foldkit/ui'

import { FetchTelemetry } from './command'
import type { Message } from './message'
import { Model, TelemetryAsyncData } from './model'
import {
  CHART_MODE_RADIO_GROUP_ID,
  PACKAGE_RADIO_GROUP_ID,
  PERIOD_RADIO_GROUP_ID,
} from './radioGroups'

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    telemetry: TelemetryAsyncData.Loading(),
    chartMode: 'Adoption',
    chartModeRadioGroup: RadioGroup.init({ id: CHART_MODE_RADIO_GROUP_ID }),
    selectedPackageId: 'Core',
    packageRadioGroup: RadioGroup.init({ id: PACKAGE_RADIO_GROUP_ID }),
    period: 'LastSixteenWeeks',
    periodRadioGroup: RadioGroup.init({ id: PERIOD_RADIO_GROUP_ID }),
    maybeChartHostId: Option.none(),
    maybeChartError: Option.none(),
    maybeSelectedDatumId: Option.none(),
  },
  commands: [FetchTelemetry()],
})
