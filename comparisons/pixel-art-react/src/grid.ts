import { MAX_HISTORY } from './constants'
import type { Cell, Grid, MirrorMode, PaletteIndex } from './types'

export const isGridEmpty = (grid: Grid): boolean =>
  grid.every(row => row.every(cell => cell === null))

export const getCell = (grid: Grid, x: number, y: number): Cell =>
  grid[y]?.[x] ?? null

export const createEmptyGrid = (size: number): Grid =>
  Array.from(
    { length: size },
    (): ReadonlyArray<Cell> => Array.from({ length: size }, (): Cell => null),
  )

export const setPixel = (
  grid: Grid,
  x: number,
  y: number,
  colorIndex: PaletteIndex,
): Grid =>
  grid.map((row, rowIndex) =>
    rowIndex === y
      ? row.map((cell, colIndex) => (colIndex === x ? colorIndex : cell))
      : row,
  )

export const setPixels = (
  grid: Grid,
  positions: ReadonlyArray<readonly [number, number]>,
  colorIndex: PaletteIndex,
): Grid =>
  positions.reduce<Grid>(
    (currentGrid, [positionX, positionY]) =>
      setPixel(currentGrid, positionX, positionY, colorIndex),
    grid,
  )

export const erasePixel = (grid: Grid, x: number, y: number): Grid =>
  grid.map((row, rowIndex) =>
    rowIndex === y
      ? row.map((cell, colIndex) => (colIndex === x ? null : cell))
      : row,
  )

export const erasePixels = (
  grid: Grid,
  positions: ReadonlyArray<readonly [number, number]>,
): Grid =>
  positions.reduce<Grid>(
    (currentGrid, [positionX, positionY]) =>
      erasePixel(currentGrid, positionX, positionY),
    grid,
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
  const fillCell: Cell = fillColorIndex
  if (targetCell === fillCell) {
    return grid
  }

  const size = grid.length
  const result: Array<Array<Cell>> = grid.map(row => [...row])
  const stack: Array<readonly [number, number]> = [[startX, startY]]

  for (;;) {
    const maybePosition = stack.pop()
    if (maybePosition === undefined) {
      break
    }
    const [x, y] = maybePosition
    if (x < 0 || x >= size || y < 0 || y >= size) {
      continue
    }
    const row = result[y]
    if (row === undefined || row[x] !== targetCell) {
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
): ReadonlyArray<Grid> => [...stack, grid].slice(-MAX_HISTORY)
