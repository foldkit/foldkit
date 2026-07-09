import { Schema as S } from 'effect'

import { Dialog, Listbox } from '@foldkit/ui'

export const Model = S.Struct({
  grid: Grid,
  undoStack: S.Array(Grid),
  redoStack: S.Array(Grid),
  selectedColorIndex: PaletteIndex,
  gridSize: S.Number,
  tool: Tool,
  mirrorMode: MirrorMode,
  isDrawing: S.Boolean,
  maybeHoveredCell: S.Option(Position),
  errorDialog: Dialog.Model,
  maybeExportError: S.Option(S.String),
  paletteThemeIndex: S.Number,
  gridSizeConfirmDialog: Dialog.Model,
  maybePendingGridSize: S.Option(S.Number),
  themeListbox: Listbox.Model,
})
