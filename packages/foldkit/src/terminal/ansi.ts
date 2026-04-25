import { Match, Option } from 'effect'

import type { Cell, CellGrid } from './cell'
import { cellEquals } from './cell'
import type { Color } from './view'

const ESC = '\x1b['
const RESET = `${ESC}0m`

const colorToFgCode = (color: Color): string =>
  Match.value(color).pipe(
    Match.when('Black', () => '30'),
    Match.when('Red', () => '31'),
    Match.when('Green', () => '32'),
    Match.when('Yellow', () => '33'),
    Match.when('Blue', () => '34'),
    Match.when('Magenta', () => '35'),
    Match.when('Cyan', () => '36'),
    Match.when('White', () => '37'),
    Match.when('Default', () => '39'),
    Match.when('BrightBlack', () => '90'),
    Match.when('BrightRed', () => '91'),
    Match.when('BrightGreen', () => '92'),
    Match.when('BrightYellow', () => '93'),
    Match.when('BrightBlue', () => '94'),
    Match.when('BrightMagenta', () => '95'),
    Match.when('BrightCyan', () => '96'),
    Match.when('BrightWhite', () => '97'),
    Match.exhaustive,
  )

const colorToBgCode = (color: Color): string =>
  Match.value(color).pipe(
    Match.when('Black', () => '40'),
    Match.when('Red', () => '41'),
    Match.when('Green', () => '42'),
    Match.when('Yellow', () => '43'),
    Match.when('Blue', () => '44'),
    Match.when('Magenta', () => '45'),
    Match.when('Cyan', () => '46'),
    Match.when('White', () => '47'),
    Match.when('Default', () => '49'),
    Match.when('BrightBlack', () => '100'),
    Match.when('BrightRed', () => '101'),
    Match.when('BrightGreen', () => '102'),
    Match.when('BrightYellow', () => '103'),
    Match.when('BrightBlue', () => '104'),
    Match.when('BrightMagenta', () => '105'),
    Match.when('BrightCyan', () => '106'),
    Match.when('BrightWhite', () => '107'),
    Match.exhaustive,
  )

const styleCell = (cell: Cell): string => {
  const codes: Array<string> = []

  Option.map(cell.foreground, color => {
    codes.push(colorToFgCode(color))
  })

  Option.map(cell.background, color => {
    codes.push(colorToBgCode(color))
  })

  if (cell.isBold) {
    codes.push('1')
  }
  if (cell.isDim) {
    codes.push('2')
  }
  if (cell.isItalic) {
    codes.push('3')
  }
  if (cell.isUnderline) {
    codes.push('4')
  }

  if (codes.length === 0) {
    return cell.char
  }

  return `${ESC}${codes.join(';')}m${cell.char}${RESET}`
}

const moveCursor = (row: number, col: number): string =>
  `${ESC}${row + 1};${col + 1}H`

const hideCursor = `${ESC}?25l`
const showCursor = `${ESC}?25h`

const getCell = (
  grid: CellGrid,
  row: number,
  col: number,
): Cell | undefined => {
  const gridRow = grid[row]
  return gridRow ? gridRow[col] : undefined
}

/** Render the full grid to an ANSI string (for initial render). */
export const renderFull = (grid: CellGrid): string => {
  let output = hideCursor + moveCursor(0, 0)

  for (let row = 0; row < grid.length; row++) {
    output += moveCursor(row, 0)
    const gridRow = grid[row]
    if (!gridRow) {
      continue
    }
    for (let col = 0; col < gridRow.length; col++) {
      const cell = gridRow[col]
      if (cell) {
        output += styleCell(cell)
      }
    }
  }

  return output
}

/** Render only the cells that changed between two grids. */
export const renderDiff = (previous: CellGrid, next: CellGrid): string => {
  let output = hideCursor
  let lastRow = -1
  let lastCol = -1

  for (let row = 0; row < next.length; row++) {
    const nextRow = next[row]
    if (!nextRow) {
      continue
    }
    for (let col = 0; col < nextRow.length; col++) {
      const nextCell = nextRow[col]
      if (!nextCell) {
        continue
      }

      const previousCell = getCell(previous, row, col)

      if (previousCell && cellEquals(previousCell, nextCell)) {
        continue
      }

      if (row !== lastRow || col !== lastCol + 1) {
        output += moveCursor(row, col)
      }

      output += styleCell(nextCell)
      lastRow = row
      lastCol = col
    }
  }

  return output
}

/** Enter the alternate screen buffer. */
export const enterAltScreen = `${ESC}?1049h`

/** Leave the alternate screen buffer. */
export const exitAltScreen = `${ESC}?1049l`

/** Clear the entire screen. */
export const clearScreen = `${ESC}2J${ESC}H`

export { hideCursor, showCursor }
