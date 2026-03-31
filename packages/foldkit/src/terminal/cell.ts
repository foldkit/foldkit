import { Option } from 'effect'

import type { Color } from './view'

/** A single cell in the terminal grid. */
export type Cell = Readonly<{
  char: string
  foreground: Option.Option<Color>
  background: Option.Option<Color>
  isBold: boolean
  isDim: boolean
  isUnderline: boolean
  isItalic: boolean
}>

export const emptyCell: Cell = {
  char: ' ',
  foreground: Option.none(),
  background: Option.none(),
  isBold: false,
  isDim: false,
  isUnderline: false,
  isItalic: false,
}

/** A 2D grid of cells — rows of columns. */
export type CellGrid = ReadonlyArray<ReadonlyArray<Cell>>

/** Create an empty grid filled with spaces. */
export const createGrid = (width: number, height: number): CellGrid => {
  const row = globalThis.Array.from({ length: width }, () => emptyCell)
  return globalThis.Array.from({ length: height }, () => [...row])
}

/** Check if two cells are visually identical. */
export const cellEquals = (a: Cell, b: Cell): boolean =>
  a.char === b.char &&
  Option.getEquivalence(
    (x: Color, y: Color) => x === y,
  )(a.foreground, b.foreground) &&
  Option.getEquivalence(
    (x: Color, y: Color) => x === y,
  )(a.background, b.background) &&
  a.isBold === b.isBold &&
  a.isDim === b.isDim &&
  a.isUnderline === b.isUnderline &&
  a.isItalic === b.isItalic
