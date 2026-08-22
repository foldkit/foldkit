import { type Update } from 'foldkit'

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    PressedCell: ({ x, y }) =>
      M.value(model.tool).pipe(
        withUpdateReturn,
        M.when('Brush', () => ({
          model: evo(model, {
            grid: () => applyBrush(model, x, y),
            undoStack: () => pushHistory(model.undoStack, model.grid),
            redoStack: () => [],
            isDrawing: () => true,
          }),
        })),
        M.when('Fill', () => {
          const nextModel = evo(model, {
            grid: () => applyFill(model, x, y),
            undoStack: () => pushHistory(model.undoStack, model.grid),
            redoStack: () => [],
          })
          return { model: nextModel, commands: [saveCanvas(nextModel)] }
        }),
        // ...
      ),
    ClickedUndo: () =>
      Array.match(model.undoStack, {
        onEmpty: () => ({ model }),
        onNonEmpty: nonEmptyUndoStack => {
          const nextModel = evo(model, {
            grid: () => Array.lastNonEmpty(nonEmptyUndoStack),
            undoStack: () => Array.initNonEmpty(nonEmptyUndoStack),
            redoStack: () => [...model.redoStack, model.grid],
          })
          return { model: nextModel, commands: [saveCanvas(nextModel)] }
        },
      }),
    // ... 23 more handlers
  })
