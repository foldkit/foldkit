import { memo, useCallback, useMemo } from 'react'

import { EMPTY_COLOR } from '../constants'
import { floodFill, getMirroredPositions } from '../grid'
import type { Action } from '../reducer'
import type {
  Cell,
  Grid,
  MirrorMode,
  PaletteIndex,
  Position,
  Tool,
} from '../types'

type CanvasProps = Readonly<{
  grid: Grid
  gridSize: number
  tool: Tool
  mirrorMode: MirrorMode
  hoveredCell: Position | null
  isDrawing: boolean
  selectedColorIndex: PaletteIndex
  paletteColors: ReadonlyArray<string>
  dispatch: React.Dispatch<Action>
}>

const computePreviewPositions = (
  grid: Grid,
  gridSize: number,
  tool: Tool,
  mirrorMode: MirrorMode,
  hoveredCell: Position | null,
  isDrawing: boolean,
  selectedColorIndex: PaletteIndex,
): ReadonlyArray<readonly [number, number]> => {
  if (isDrawing || hoveredCell === null) {
    return []
  }
  const { x, y } = hoveredCell
  if (tool === 'Brush' || tool === 'Eraser') {
    return getMirroredPositions(x, y, gridSize, mirrorMode)
  }
  if (tool === 'Fill') {
    return computeFillPreview(grid, x, y, selectedColorIndex)
  }
  return []
}

const computeFillPreview = (
  grid: Grid,
  startX: number,
  startY: number,
  fillColorIndex: PaletteIndex,
): ReadonlyArray<readonly [number, number]> => {
  const filledGrid = floodFill(grid, startX, startY, fillColorIndex)
  const positions: Array<readonly [number, number]> = []
  filledGrid.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell !== grid[y]?.[x]) {
        positions.push([x, y])
      }
    })
  })
  return positions
}

const CellView = memo(function CellView({
  x,
  y,
  backgroundColor,
  dispatch,
}: Readonly<{
  x: number
  y: number
  backgroundColor: string
  dispatch: React.Dispatch<Action>
}>) {
  const handleMouseDown = useCallback(
    () => dispatch({ type: 'PressedCell', x, y }),
    [dispatch, x, y],
  )
  const handleMouseEnter = useCallback(
    () => dispatch({ type: 'EnteredCell', x, y }),
    [dispatch, x, y],
  )

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      style={{ flex: 1, backgroundColor }}
    />
  )
})

const RowView = memo(function RowView({
  row,
  y,
  previewColor,
  previewPositions,
  paletteColors,
  dispatch,
}: Readonly<{
  row: ReadonlyArray<Cell>
  y: number
  previewColor: string
  previewPositions: ReadonlyArray<readonly [number, number]>
  paletteColors: ReadonlyArray<string>
  dispatch: React.Dispatch<Action>
}>) {
  return (
    <div style={{ display: 'flex', flex: 1 }}>
      {row.map((cell, x) => {
        const isPreview = previewPositions.some(
          ([previewX, previewY]) => previewX === x && previewY === y,
        )
        const baseColor =
          cell === null ? EMPTY_COLOR : (paletteColors[cell] ?? EMPTY_COLOR)
        const displayColor = isPreview ? previewColor : baseColor

        return (
          <CellView
            key={x}
            x={x}
            y={y}
            backgroundColor={displayColor}
            dispatch={dispatch}
          />
        )
      })}
    </div>
  )
})

export const Canvas = memo(function Canvas({
  grid,
  gridSize,
  tool,
  mirrorMode,
  hoveredCell,
  isDrawing,
  selectedColorIndex,
  paletteColors,
  dispatch,
}: CanvasProps) {
  const previewPositions = useMemo(
    () =>
      computePreviewPositions(
        grid,
        gridSize,
        tool,
        mirrorMode,
        hoveredCell,
        isDrawing,
        selectedColorIndex,
      ),
    [
      grid,
      gridSize,
      tool,
      mirrorMode,
      hoveredCell,
      isDrawing,
      selectedColorIndex,
    ],
  )

  const previewColor =
    tool === 'Eraser'
      ? EMPTY_COLOR
      : (paletteColors[selectedColorIndex] ?? EMPTY_COLOR)

  const handleMouseLeave = useCallback(
    () => dispatch({ type: 'LeftCanvas' }),
    [dispatch],
  )

  return (
    <div className="flex flex-col items-center gap-4 min-w-0 self-start col-span-full min-[480px]:col-span-full md:col-span-1 -order-1 md:order-none">
      <div className="w-full max-w-lg" onMouseLeave={handleMouseLeave}>
        <div
          className="cursor-crosshair select-none w-full aspect-square"
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
          }}
        >
          {Array.from({ length: gridSize }, (_, y) => {
            const row = grid[y]
            if (row === undefined) {
              return null
            }
            const rowPreviewPositions = previewPositions.filter(
              ([, previewY]) => previewY === y,
            )
            return (
              <RowView
                key={y}
                row={row}
                y={y}
                previewColor={previewColor}
                previewPositions={rowPreviewPositions}
                paletteColors={paletteColors}
                dispatch={dispatch}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
})
