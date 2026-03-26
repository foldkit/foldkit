import { Array, Equal, Option, pipe } from 'effect'

import { MAX_HISTORY } from './constant'
import type { Cell, Grid, MirrorMode, PaletteIndex } from './model'

export const isGridEmpty = (grid: Grid): boolean =>
  grid.every(row => row.every(Option.isNone))

export const getCell = (grid: Grid, x: number, y: number): Cell =>
  pipe(
    grid,
    Array.get(y),
    Option.flatMap(Array.get(x)),
    Option.getOrElse(() => Option.none<PaletteIndex>()),
  )

export const createEmptyGrid = (size: number): Grid =>
  Array.makeBy(size, () =>
    Array.makeBy(size, () => Option.none<PaletteIndex>()),
  )

export const setPixel = (
  grid: Grid,
  x: number,
  y: number,
  colorIndex: PaletteIndex,
): Grid =>
  Array.map(grid, (row, rowIndex) =>
    rowIndex === y
      ? Array.map(row, (cell, colIndex) =>
          colIndex === x ? Option.some(colorIndex) : cell,
        )
      : row,
  )

export const setPixels = (
  grid: Grid,
  positions: ReadonlyArray<readonly [number, number]>,
  colorIndex: PaletteIndex,
): Grid =>
  Array.reduce(positions, grid, (currentGrid, [positionX, positionY]) =>
    setPixel(currentGrid, positionX, positionY, colorIndex),
  )

export const erasePixel = (grid: Grid, x: number, y: number): Grid =>
  Array.map(grid, (row, rowIndex) =>
    rowIndex === y
      ? Array.map(row, (cell, colIndex) =>
          colIndex === x ? Option.none() : cell,
        )
      : row,
  )

export const erasePixels = (
  grid: Grid,
  positions: ReadonlyArray<readonly [number, number]>,
): Grid =>
  Array.reduce(positions, grid, (currentGrid, [positionX, positionY]) =>
    erasePixel(currentGrid, positionX, positionY),
  )

export const getMirroredPositions = (
  x: number,
  y: number,
  gridSize: number,
  mirrorMode: MirrorMode,
): ReadonlyArray<readonly [number, number]> => {
  const mirrorX = gridSize - 1 - x
  const mirrorY = gridSize - 1 - y

  if (mirrorMode === 'Both') {
    return [
      [x, y],
      [mirrorX, y],
      [x, mirrorY],
      [mirrorX, mirrorY],
    ]
  }
  if (mirrorMode === 'Horizontal') {
    return [
      [x, y],
      [mirrorX, y],
    ]
  }
  if (mirrorMode === 'Vertical') {
    return [
      [x, y],
      [x, mirrorY],
    ]
  }
  return [[x, y]]
}

export const floodFill = (
  grid: Grid,
  startX: number,
  startY: number,
  fillColorIndex: PaletteIndex,
): Grid => {
  const targetCell = getCell(grid, startX, startY)
  const fillCell: Cell = Option.some(fillColorIndex)
  if (Equal.equals(targetCell, fillCell)) {
    return grid
  }

  const size = grid.length
  const result = grid.map(row => [...row])
  const stack: Array<readonly [number, number]> = [[startX, startY]]

  while (true) {
    const maybePosition = stack.pop()
    if (maybePosition === undefined) {
      break
    }
    const [x, y] = maybePosition
    if (x < 0 || x >= size || y < 0 || y >= size) {
      continue
    }
    const row = result[y]
    if (row === undefined || !Equal.equals(row[x], targetCell)) {
      continue
    }

    row[x] = fillCell
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }

  return result
}

export const pushHistory = (
  stack: ReadonlyArray<Grid>,
  grid: Grid,
): ReadonlyArray<Grid> => Array.takeRight([...stack, grid], MAX_HISTORY)
