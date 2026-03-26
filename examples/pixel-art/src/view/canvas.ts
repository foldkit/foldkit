import { Array, Equal, Option, pipe } from 'effect'
import { type Html, createKeyedLazy, html } from 'foldkit/html'

import { EMPTY_COLOR } from '../constant'
import { floodFill, getMirroredPositions } from '../grid'
import { EnteredCell, LeftCanvas, type Message, PressedCell } from '../message'
import type { Cell, Grid, HexColor, Model, PaletteIndex } from '../model'
import { type PaletteTheme, resolveColor } from '../palette'

const { div, Class, OnMouseDown, OnMouseEnter, OnMouseLeave, Style } =
  html<Message>()

export const lazyRow = createKeyedLazy()

export const EMPTY_PREVIEW_POSITIONS: ReadonlyArray<readonly [number, number]> =
  []

export const computePreviewPositions = (
  model: Model,
): ReadonlyArray<readonly [number, number]> => {
  if (model.isDrawing) {
    return EMPTY_PREVIEW_POSITIONS
  }
  return Option.match(model.maybeHoveredCell, {
    onNone: () => EMPTY_PREVIEW_POSITIONS,
    onSome: ({ x, y }) => {
      if (model.tool === 'Brush' || model.tool === 'Eraser') {
        return getMirroredPositions(x, y, model.gridSize, model.mirrorMode)
      }
      if (model.tool === 'Fill') {
        return computeFillPreview(model.grid, x, y, model.selectedColorIndex)
      }
      return EMPTY_PREVIEW_POSITIONS
    },
  })
}

export const computeFillPreview = (
  grid: Grid,
  startX: number,
  startY: number,
  fillColorIndex: PaletteIndex,
): ReadonlyArray<readonly [number, number]> => {
  const filledGrid = floodFill(grid, startX, startY, fillColorIndex)
  const positions: Array<readonly [number, number]> = []
  Array.forEach(filledGrid, (row, y) => {
    Array.forEach(row, (cell, x) => {
      if (!Equal.equals(cell, grid[y]?.[x])) {
        positions.push([x, y])
      }
    })
  })
  return positions.length === 0 ? EMPTY_PREVIEW_POSITIONS : positions
}

export const canvasView = (model: Model, theme: PaletteTheme): Html => {
  const previewPositions = computePreviewPositions(model)

  return div(
    [
      Class(
        'flex flex-col items-center gap-4 min-w-0 self-start col-span-full min-[480px]:col-span-full md:col-span-1 -order-1 md:order-none',
      ),
    ],
    [
      div(
        [OnMouseLeave(LeftCanvas()), Class('w-full max-w-lg')],
        [
          html<Message>().keyed('div')(
            `canvas-${model.gridSize}`,
            [
              Class('cursor-crosshair select-none w-full aspect-square'),
              Style({
                display: 'flex',
                'flex-direction': 'column',
                backgroundColor: '#ffffff',
              }),
            ],
            Array.filterMap(
              Array.makeBy(model.gridSize, y => y),
              y => {
                const row = model.grid[y]
                if (row === undefined) {
                  return Option.none()
                }
                const rowPreviewPositions = pipe(
                  previewPositions,
                  Array.filter(([, positionY]) => positionY === y),
                  Array.match({
                    onEmpty: () => EMPTY_PREVIEW_POSITIONS,
                    onNonEmpty: filtered => filtered,
                  }),
                )
                return Option.some(
                  lazyRow(`${y}`, rowView, [
                    row,
                    y,
                    model.tool === 'Eraser'
                      ? EMPTY_COLOR
                      : (theme.colors[model.selectedColorIndex] ?? EMPTY_COLOR),
                    rowPreviewPositions,
                    theme,
                  ]),
                )
              },
            ),
          ),
        ],
      ),
    ],
  )
}

export const rowView = (
  row: ReadonlyArray<Cell>,
  y: number,
  previewColor: HexColor,
  previewPositions: ReadonlyArray<readonly [number, number]>,
  theme: PaletteTheme,
): Html =>
  div(
    [Style({ display: 'flex', flex: '1' })],
    Array.map(row, (cell, x) => {
      const isPreview = previewPositions.some(
        ([previewX, previewY]) => previewX === x && previewY === y,
      )
      const displayColor = isPreview ? previewColor : resolveColor(cell, theme)

      return div(
        [
          OnMouseDown(PressedCell({ x, y })),
          OnMouseEnter(EnteredCell({ x, y })),
          Style({
            flex: '1',
            backgroundColor: displayColor,
          }),
        ],
        [],
      )
    }),
  )
