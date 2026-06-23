import { RadioGroup } from '@foldkit/ui'

import type { ChartMode, PackageId, Period } from './domain'

export const ChartModeRadioGroup = RadioGroup.create<ChartMode>()
export const PackageIdRadioGroup = RadioGroup.create<PackageId>()
export const PeriodRadioGroup = RadioGroup.create<Period>()
