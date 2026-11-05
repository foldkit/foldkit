import { Listbox, RadioGroup } from '@foldkit/ui'

import type { Tool } from './model'

export const TOOL_RADIO_GROUP_ID = 'tool-picker'
export const GRID_SIZE_RADIO_GROUP_ID = 'grid-size-picker'
export const PALETTE_RADIO_GROUP_ID = 'palette-picker'

export const ThemeListboxBlock = Listbox.makeBlock()
export const ToolRadioGroupBlock = RadioGroup.makeBlock<Tool>()
export const GridSizeRadioGroupBlock = RadioGroup.makeBlock()
export const PaletteRadioGroupBlock = RadioGroup.makeBlock()
