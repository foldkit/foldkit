import {
  type HexColor,
  HexColor as HexColorSchema,
  type PaletteIndex,
} from './model'

export const DEFAULT_GRID_SIZE = 16
export const EMPTY_COLOR: HexColor = HexColorSchema.make('#ffffff')
export const DEFAULT_COLOR_INDEX: PaletteIndex = 0
export const MAX_HISTORY = 50
export const VISIBLE_HISTORY_COUNT = 6
export const THUMBNAIL_CELL_SIZE = 2
export const CANVAS_SIZE_PX = 512
export const EXPORT_SCALE = 4
export const STORAGE_KEY = 'pixel-art-canvas'
export const DEFAULT_PALETTE_THEME_INDEX = 0

export const GRID_SIZES: ReadonlyArray<number> = [8, 16, 24, 32]
export const GRID_SIZE_STRINGS: ReadonlyArray<string> = GRID_SIZES.map(size =>
  size.toString(),
)
