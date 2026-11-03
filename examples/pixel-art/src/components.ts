import { makeBlock as makeListboxBlock } from '@foldkit/ui/listbox'
import { makeBlock as makeRadioGroupBlock } from '@foldkit/ui/radioGroup'

import type { Tool } from './model'

export const TOOL_RADIO_GROUP_ID = 'tool-picker'
export const GRID_SIZE_RADIO_GROUP_ID = 'grid-size-picker'
export const PALETTE_RADIO_GROUP_ID = 'palette-picker'

export const ThemeListboxBlock = makeListboxBlock()
export const ToolRadioGroupBlock = makeRadioGroupBlock<Tool>()
export const GridSizeRadioGroupBlock = makeRadioGroupBlock()
export const PaletteRadioGroupBlock = makeRadioGroupBlock()
