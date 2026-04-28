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
        model.selectedColorIndex,
        isGridEmpty(model.grid),
        model.toolRadioGroup,
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
