import { Array } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Message } from './message'
import type { Cell, HexColor } from './model'
import { type PaletteTheme, resolveColor } from './palette'

const rowView = (
  row: ReadonlyArray<Cell>,
  y: number,
  previewColor: HexColor,
  previewPositions: ReadonlyArray<readonly [number, number]>,
  theme: PaletteTheme,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Style({ display: 'flex', flex: '1' })],
    Array.map(row, (cell, x) => {
      const isPreview = previewPositions.some(
        ([previewX, previewY]) => previewX === x && previewY === y,
      )
      const displayColor = isPreview ? previewColor : resolveColor(cell, theme)

      return h.div([
        h.OnMouseDown(Message.PressedCell({ x, y })),
        h.OnMouseEnter(Message.EnteredCell({ x, y })),
        h.Style({ flex: '1', backgroundColor: displayColor }),
      ])
    }),
  )
