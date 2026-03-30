import { EMPTY_COLOR } from './constants'
import type { Cell } from './types'

export type PaletteTheme = Readonly<{
  name: string
  colors: ReadonlyArray<string>
}>

export const PALETTE_THEMES: ReadonlyArray<PaletteTheme> = [
  {
    name: 'Syntax',
    colors: [
      '#262427',
      '#545452',
      '#8a869c',
      '#fcfcfa',
      '#ff7272',
      '#ff9eb0',
      '#bcdf59',
      '#ffca58',
      '#f5a623',
      '#49cae4',
      '#a093e2',
      '#6b5ce7',
      '#e06cc0',
      '#3d8b6e',
      '#9e6a3f',
      '#1c1a20',
    ],
  },
  {
    name: 'ISO50',
    colors: [
      '#2b2b2b',
      '#5c4b3e',
      '#8b6f4e',
      '#c49a6c',
      '#e8c88a',
      '#f2dfa7',
      '#c0785c',
      '#a85c3b',
      '#7b8f6a',
      '#a3b18a',
      '#6b8e8e',
      '#8fa4a9',
      '#c4b4a0',
      '#e8d5c0',
      '#d4a574',
      '#f5efe6',
    ],
  },
  {
    name: 'Sunset',
    colors: [
      '#1a1033',
      '#2d1b4e',
      '#5c2d82',
      '#8b3fa0',
      '#c9406c',
      '#e85d75',
      '#ff7b5a',
      '#ff9e3d',
      '#ffc233',
      '#ffe066',
      '#fff4b8',
      '#3d1f6d',
      '#ffa0b4',
      '#ff6b8a',
      '#ffccd5',
      '#1e0f3d',
    ],
  },
  {
    name: 'Ocean',
    colors: [
      '#0a1628',
      '#132b4a',
      '#1a4a6e',
      '#2274a5',
      '#30a5c8',
      '#5ec4d4',
      '#8edce6',
      '#b8efe8',
      '#e0f7ef',
      '#f5a962',
      '#e87843',
      '#d4bc94',
      '#f0e6d0',
      '#2a6b5a',
      '#c45b3d',
      '#ffffff',
    ],
  },
  {
    name: 'Mono',
    colors: [
      '#000000',
      '#111111',
      '#222222',
      '#444444',
      '#666666',
      '#888888',
      '#aaaaaa',
      '#cccccc',
      '#eeeeee',
      '#ffffff',
      '#e63946',
      '#457b9d',
      '#2a9d8f',
      '#e9c46a',
      '#264653',
      '#f4a261',
    ],
  },
]

export const resolveColor = (cell: Cell, theme: PaletteTheme): string =>
  cell === null ? EMPTY_COLOR : (theme.colors[cell] ?? EMPTY_COLOR)

export const currentPaletteTheme = (paletteThemeIndex: number): PaletteTheme =>
  PALETTE_THEMES[paletteThemeIndex] ?? PALETTE_THEMES[0]!

export const currentPaletteColors = (
  paletteThemeIndex: number,
): ReadonlyArray<string> => currentPaletteTheme(paletteThemeIndex).colors
