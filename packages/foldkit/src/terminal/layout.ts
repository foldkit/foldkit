import { Match, Option } from 'effect'

import type { Cell, CellGrid } from './cell'
import { createGrid, emptyCell } from './cell'
import type { BorderStyle, TerminalAttributes, TerminalNode } from './view'

type Rect = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

/** Lay out a TerminalNode tree into a flat CellGrid. */
export const layout = (
  node: TerminalNode,
  availableWidth: number,
  availableHeight: number,
): CellGrid => {
  const grid = createGrid(availableWidth, availableHeight)
  const mutableGrid = grid.map(row => [...row])
  renderNode(mutableGrid, node, {
    x: 0,
    y: 0,
    width: availableWidth,
    height: availableHeight,
  })
  return mutableGrid
}

const setGridCell = (
  grid: Array<Array<Cell>>,
  row: number,
  col: number,
  cell: Cell,
): void => {
  const gridRow = grid[row]
  if (gridRow && col >= 0 && col < gridRow.length) {
    gridRow[col] = cell
  }
}

const getGridWidth = (grid: Array<Array<Cell>>): number => {
  const firstRow = grid[0]
  return firstRow ? firstRow.length : 0
}

const renderNode = (
  grid: Array<Array<Cell>>,
  node: TerminalNode,
  rect: Rect,
): void => {
  Match.value(node).pipe(
    Match.tag('Text', textNode => {
      renderText(grid, textNode.content, textNode.attributes, rect)
    }),
    Match.tag('Box', boxNode => {
      renderBox(grid, boxNode.attributes, boxNode.children, rect)
    }),
    Match.exhaustive,
  )
}

const renderText = (
  grid: Array<Array<Cell>>,
  content: string,
  attributes: TerminalAttributes,
  rect: Rect,
): void => {
  let col = rect.x
  let row = rect.y

  for (const char of content) {
    if (row >= rect.y + rect.height) {
      break
    }

    if (char === '\n') {
      col = rect.x
      row++
      continue
    }

    if (col >= rect.x + rect.width) {
      col = rect.x
      row++
      if (row >= rect.y + rect.height) {
        break
      }
    }

    if (row >= 0 && row < grid.length && col >= 0 && col < getGridWidth(grid)) {
      setGridCell(grid, row, col, {
        char,
        foreground: attributes.foreground,
        background: attributes.background,
        isBold: attributes.isBold,
        isDim: attributes.isDim,
        isUnderline: attributes.isUnderline,
        isItalic: attributes.isItalic,
      })
    }

    col++
  }
}

const borderChars = (
  style: BorderStyle,
): Readonly<{
  topLeft: string
  topRight: string
  bottomLeft: string
  bottomRight: string
  horizontal: string
  vertical: string
}> =>
  Match.value(style).pipe(
    Match.when('None', () => ({
      topLeft: ' ',
      topRight: ' ',
      bottomLeft: ' ',
      bottomRight: ' ',
      horizontal: ' ',
      vertical: ' ',
    })),
    Match.when('Single', () => ({
      topLeft: '┌',
      topRight: '┐',
      bottomLeft: '└',
      bottomRight: '┘',
      horizontal: '─',
      vertical: '│',
    })),
    Match.when('Double', () => ({
      topLeft: '╔',
      topRight: '╗',
      bottomLeft: '╚',
      bottomRight: '╝',
      horizontal: '═',
      vertical: '║',
    })),
    Match.when('Round', () => ({
      topLeft: '╭',
      topRight: '╮',
      bottomLeft: '╰',
      bottomRight: '╯',
      horizontal: '─',
      vertical: '│',
    })),
    Match.when('Bold', () => ({
      topLeft: '┏',
      topRight: '┓',
      bottomLeft: '┗',
      bottomRight: '┛',
      horizontal: '━',
      vertical: '┃',
    })),
    Match.exhaustive,
  )

const renderBorder = (
  grid: Array<Array<Cell>>,
  style: BorderStyle,
  attributes: TerminalAttributes,
  rect: Rect,
): void => {
  if (style === 'None') {
    return
  }

  const chars = borderChars(style)
  const cellStyle: Omit<Cell, 'char'> = {
    foreground: attributes.foreground,
    background: attributes.background,
    isBold: attributes.isBold,
    isDim: attributes.isDim,
    isUnderline: false,
    isItalic: false,
  }

  const setChar = (row: number, col: number, char: string): void => {
    if (row >= 0 && row < grid.length && col >= 0 && col < getGridWidth(grid)) {
      setGridCell(grid, row, col, { ...cellStyle, char })
    }
  }

  setChar(rect.y, rect.x, chars.topLeft)
  setChar(rect.y, rect.x + rect.width - 1, chars.topRight)
  setChar(rect.y + rect.height - 1, rect.x, chars.bottomLeft)
  setChar(rect.y + rect.height - 1, rect.x + rect.width - 1, chars.bottomRight)

  for (let col = rect.x + 1; col < rect.x + rect.width - 1; col++) {
    setChar(rect.y, col, chars.horizontal)
    setChar(rect.y + rect.height - 1, col, chars.horizontal)
  }

  for (let row = rect.y + 1; row < rect.y + rect.height - 1; row++) {
    setChar(row, rect.x, chars.vertical)
    setChar(row, rect.x + rect.width - 1, chars.vertical)
  }
}

const fillBackground = (
  grid: Array<Array<Cell>>,
  background: Option.Option<string>,
  rect: Rect,
): void => {
  if (Option.isNone(background)) {
    return
  }

  for (let row = rect.y; row < rect.y + rect.height; row++) {
    for (let col = rect.x; col < rect.x + rect.width; col++) {
      if (
        row >= 0 &&
        row < grid.length &&
        col >= 0 &&
        col < getGridWidth(grid)
      ) {
        setGridCell(grid, row, col, {
          ...emptyCell,
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          background: background as Option.Option<any>,
        })
      }
    }
  }
}

const renderBox = (
  grid: Array<Array<Cell>>,
  attributes: TerminalAttributes,
  children: ReadonlyArray<TerminalNode>,
  rect: Rect,
): void => {
  const hasBorder = attributes.border !== 'None'
  const borderOffset = hasBorder ? 1 : 0

  fillBackground(grid, attributes.background, rect)

  if (hasBorder) {
    renderBorder(grid, attributes.border, attributes, rect)
  }

  const contentRect: Rect = {
    x: rect.x + borderOffset + attributes.paddingLeft,
    y: rect.y + borderOffset + attributes.paddingTop,
    width:
      rect.width -
      borderOffset * 2 -
      attributes.paddingLeft -
      attributes.paddingRight,
    height:
      rect.height -
      borderOffset * 2 -
      attributes.paddingTop -
      attributes.paddingBottom,
  }

  if (contentRect.width <= 0 || contentRect.height <= 0) {
    return
  }

  layoutChildren(grid, attributes, children, contentRect)
}

/** Measure the natural size of a node (without constraints). */
const measureNode = (
  node: TerminalNode,
  availableWidth: number,
): Readonly<{ width: number; height: number }> =>
  Match.value(node).pipe(
    Match.tag('Text', textNode => {
      const lines = wrapText(textNode.content, availableWidth)
      return {
        width: lines.reduce((max, line) => Math.max(max, line.length), 0),
        height: lines.length,
      }
    }),
    Match.tag('Box', boxNode => {
      const hasBorder = boxNode.attributes.border !== 'None'
      const borderOffset = hasBorder ? 1 : 0
      const paddingH =
        boxNode.attributes.paddingLeft + boxNode.attributes.paddingRight
      const paddingV =
        boxNode.attributes.paddingTop + boxNode.attributes.paddingBottom
      const overhead = borderOffset * 2

      const innerWidth = Option.getOrElse(boxNode.attributes.width, () =>
        Math.max(0, availableWidth - overhead - paddingH),
      )

      const childSizes = boxNode.children.map(child =>
        measureNode(child, innerWidth),
      )

      const contentSize =
        boxNode.attributes.flexDirection === 'Column'
          ? {
              width: childSizes.reduce(
                (max, size) => Math.max(max, size.width),
                0,
              ),
              height: childSizes.reduce(
                (total, size) => total + size.height,
                0,
              ),
            }
          : {
              width: childSizes.reduce((total, size) => total + size.width, 0),
              height: childSizes.reduce(
                (max, size) => Math.max(max, size.height),
                0,
              ),
            }

      return {
        width: Option.getOrElse(
          boxNode.attributes.width,
          () => contentSize.width + overhead + paddingH,
        ),
        height: Option.getOrElse(
          boxNode.attributes.height,
          () => contentSize.height + overhead + paddingV,
        ),
      }
    }),
    Match.exhaustive,
  )

const wrapText = (text: string, maxWidth: number): ReadonlyArray<string> => {
  if (maxWidth <= 0) {
    return ['']
  }

  const result: Array<string> = []
  const lines = text.split('\n')

  for (const line of lines) {
    if (line.length <= maxWidth) {
      result.push(line)
    } else {
      for (let i = 0; i < line.length; i += maxWidth) {
        result.push(line.slice(i, i + maxWidth))
      }
    }
  }

  return result.length === 0 ? [''] : result
}

const getNodeWidth = (node: TerminalNode): Option.Option<number> =>
  node._tag === 'Box' ? node.attributes.width : Option.none()

const getNodeHeight = (node: TerminalNode): Option.Option<number> =>
  node._tag === 'Box' ? node.attributes.height : Option.none()

const layoutChildren = (
  grid: Array<Array<Cell>>,
  attributes: TerminalAttributes,
  children: ReadonlyArray<TerminalNode>,
  contentRect: Rect,
): void => {
  if (attributes.flexDirection === 'Column') {
    let currentY = contentRect.y

    for (const child of children) {
      if (currentY >= contentRect.y + contentRect.height) {
        break
      }

      const childSize = measureNode(child, contentRect.width)
      const childWidth = Option.match(getNodeWidth(child), {
        onNone: () => contentRect.width,
        onSome: (width: number) => Math.min(width, contentRect.width),
      })
      const childHeight = Math.min(
        Option.getOrElse(getNodeHeight(child), () => childSize.height),
        contentRect.y + contentRect.height - currentY,
      )

      renderNode(grid, child, {
        x: contentRect.x,
        y: currentY,
        width: childWidth,
        height: childHeight,
      })

      currentY += childHeight
    }
  } else {
    let currentX = contentRect.x

    for (const child of children) {
      if (currentX >= contentRect.x + contentRect.width) {
        break
      }

      const childSize = measureNode(
        child,
        contentRect.width - (currentX - contentRect.x),
      )
      const childWidth = Math.min(
        Option.getOrElse(getNodeWidth(child), () => childSize.width),
        contentRect.x + contentRect.width - currentX,
      )
      const childHeight = Option.match(getNodeHeight(child), {
        onNone: () => contentRect.height,
        onSome: (height: number) => Math.min(height, contentRect.height),
      })

      renderNode(grid, child, {
        x: currentX,
        y: contentRect.y,
        width: childWidth,
        height: childHeight,
      })

      currentX += childWidth
    }
  }
}
