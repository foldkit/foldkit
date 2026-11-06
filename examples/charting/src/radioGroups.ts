import { RadioGroup } from '@foldkit/ui'

import type { ChartMode, PackageId, Period } from './domain'

export const CHART_MODE_RADIO_GROUP_ID = 'chart-mode'
export const PACKAGE_RADIO_GROUP_ID = 'package'
export const PERIOD_RADIO_GROUP_ID = 'period'

export const ChartModeRadioGroupBlock = RadioGroup.makeBlock<ChartMode>()
export const PackageRadioGroupBlock = RadioGroup.makeBlock<PackageId>()
export const PeriodRadioGroupBlock = RadioGroup.makeBlock<Period>()
