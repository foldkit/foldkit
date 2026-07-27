import { type Document, createKeyedLazy, createLazy, html } from 'foldkit/html'

import { isGridEmpty } from './grid'
import type { Message } from './message'
import type { Model } from './model'
import { canvasView } from './view/canvas'
import { historyPanelView } from './view/history'
import { headerView, toolPanelView } from './view/toolbar'

const { div } = html<Message>()

const lazyHeader = createLazy()
const lazyToolPanel = createLazy()
const lazyHistoryPanel = createLazy()
const lazyRow = createKeyedLazy()

// Each args array is compared element-by-element against the previous render.
// If every arg is reference-equal, the view function isn't called at all.
// evo() preserves references for unchanged Model fields, so the check just works.
export const view = (model: Model): Document => ({
  title: 'Pixel Art',
  body: div(
    [],
    [
      lazyHeader(headerView, []),
      lazyToolPanel(toolPanelView, [
        model.mirrorMode,
        model.tool,
        model.gridSize,
        model.selectedColorIndex,
        isGridEmpty(model.grid),
        theme,
        model.themeListbox,
      ]),
      canvasView(model, theme),
      lazyHistoryPanel(historyPanelView, [
        model.undoStack,
        model.redoStack,
        currentGrid,
        model.gridSize,
        theme,
      ]),
    ],
  ),
})
