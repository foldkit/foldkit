import { RadioGroup } from '@foldkit/ui'

import type { ChartMode, PackageId, Period } from './domain'

export const CHART_MODE_RADIO_GROUP_ID = 'chart-mode'
export const PACKAGE_RADIO_GROUP_ID = 'package'
export const PERIOD_RADIO_GROUP_ID = 'period'

export const ChartModeRadioGroup = RadioGroup.create<ChartMode>()
export const PackageRadioGroup = RadioGroup.create<PackageId>()
export const PeriodRadioGroup = RadioGroup.create<Period>()
