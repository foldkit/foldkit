import { makeBlock as makeRadioGroupBlock } from '@foldkit/ui/radioGroup'

import type { ChartMode, PackageId, Period } from './domain'

export const CHART_MODE_RADIO_GROUP_ID = 'chart-mode'
export const PACKAGE_RADIO_GROUP_ID = 'package'
export const PERIOD_RADIO_GROUP_ID = 'period'

export const ChartModeRadioGroupBlock = makeRadioGroupBlock<ChartMode>()
export const PackageRadioGroupBlock = makeRadioGroupBlock<PackageId>()
export const PeriodRadioGroupBlock = makeRadioGroupBlock<Period>()
