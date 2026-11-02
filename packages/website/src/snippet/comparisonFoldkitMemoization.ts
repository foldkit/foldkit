import { Array, Option, pipe } from 'effect'
import { type Html, createKeyedLazy, createLazy } from 'foldkit/html'

import { isGridEmpty } from './domain/grid'
import { currentPaletteTheme } from './domain/palette'

const lazyToolPanel = createLazy()
const lazyHistoryPanel = createLazy()
const lazyRow = createKeyedLazy()

// Each args array is compared element-by-element against the previous render.
// If every arg is reference-equal, the view function isn't called at all.
// modifyFields() preserves references for unchanged Model fields, so the check just
// works, and the builder is the same object every render, so passing it
// through the args never invalidates the cache.
export const contentView = (model: Model, h: ApplicationViewBuilder): Html => {
  const theme = currentPaletteTheme(model)
  const currentGrid = model.isDrawing
    ? pipe(
        Array.last(model.undoStack),
        Option.getOrElse(() => model.grid),
      )
    : model.grid

  return h.div(
    [],
    [
      lazyToolPanel(toolPanelView, [
        model.mirrorMode,
        model.tool,
        model.gridSize,
        model.selectedColorIndex,
        isGridEmpty(model.grid),
        theme,
        model.paletteThemeIndex,
        model.themeListbox,
        model.toolRadioGroup,
        model.gridSizeRadioGroup,
        model.paletteRadioGroup,
        h,
      ]),
      canvasView(model, theme, h),
      lazyHistoryPanel(historyPanelView, [
        model.undoStack,
        model.redoStack,
        currentGrid,
        model.gridSize,
        theme,
        h,
      ]),
    ],
  )
}
