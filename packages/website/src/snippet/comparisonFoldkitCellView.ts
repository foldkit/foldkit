const rowView = (
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
          Style({ flex: '1', backgroundColor: displayColor }),
        ],
        [],
      )
    }),
  )
