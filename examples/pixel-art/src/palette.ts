import { Array, Option, pipe } from 'effect'

import { EMPTY_COLOR } from './constant'
import { type Cell, type HexColor, HexColor as HexColorSchema } from './model'

export type PaletteTheme = Readonly<{
  name: string
  colors: ReadonlyArray<HexColor>
}>

export const hex = (value: string): HexColor => HexColorSchema.make(value)

export const PALETTE_THEMES: Array.NonEmptyReadonlyArray<PaletteTheme> = [
  {
    name: 'Syntax',
    colors: [
      '#262427',
      '#ff7272',
      '#bcdf59',
      '#ffca58',
      '#49cae4',
      '#a093e2',
      '#aee8f4',
      '#fcfcfa',
      '#545452',
      '#ff8787',
      '#c6e472',
      '#ffd271',
      '#64d2e8',
      '#aea3e6',
      '#baebf6',
      '#fcfcfa',
    ].map(hex),
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
    ].map(hex),
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
    ].map(hex),
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
    ].map(hex),
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
    ].map(hex),
  },
]

export const resolveColor = (cell: Cell, theme: PaletteTheme): HexColor =>
  Option.match(cell, {
    onNone: () => EMPTY_COLOR,
    onSome: index => theme.colors[index] ?? EMPTY_COLOR,
  })

export const currentPaletteTheme = (
  model: Readonly<{ paletteThemeIndex: number }>,
): PaletteTheme =>
  pipe(
    PALETTE_THEMES,
    Array.get(model.paletteThemeIndex),
    Option.getOrElse(() => Array.headNonEmpty(PALETTE_THEMES)),
  )

export const currentPaletteColors = (
  model: Readonly<{ paletteThemeIndex: number }>,
): ReadonlyArray<HexColor> => currentPaletteTheme(model).colors
