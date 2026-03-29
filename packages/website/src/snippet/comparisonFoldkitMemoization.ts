const lazyHeader = createLazy()
const lazyToolPanel = createLazy()
const lazyHistoryPanel = createLazy()
const lazyRow = createKeyedLazy()

export const view = (model: Model): Html =>
  div(
    [],
    [
      lazyHeader(headerView, []),
      lazyToolPanel(toolPanelView, [
        model.mirrorMode,
        model.selectedColorIndex,
        isGridEmpty(model.grid),
        model.toolRadioGroup,
        // ...
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
  )
