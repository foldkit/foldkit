import { Array, Option, pipe } from 'effect'
import {
  type Document,
  type HtmlBuilder,
  createKeyedLazy,
  createLazy,
} from 'foldkit/html'

import { isGridEmpty } from './grid'
import type { Message } from './message'
import type { Model } from './model'
import { currentPaletteTheme } from './palette'
import { canvasView } from './view/canvas'
import { historyPanelView } from './view/history'
import { toolPanelView } from './view/toolbar'

const lazyToolPanel = createLazy()
const lazyHistoryPanel = createLazy()
const lazyRow = createKeyedLazy()

// Each args array is compared element-by-element against the previous render.
// If every arg is reference-equal, the view function isn't called at all.
// evo() preserves references for unchanged Model fields, so the check just
// works, and the builder is the same object every render, so passing it
// through the args never invalidates the cache.
export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const theme = currentPaletteTheme(model)
  const currentGrid = model.isDrawing
    ? pipe(
        Array.last(model.undoStack),
        Option.getOrElse(() => model.grid),
      )
    : model.grid

  return {
    title: 'Pixel Art',
    body: h.div(
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
    ),
  }
}
