import { type Update } from 'foldkit'

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    PressedCell: ({ x, y }) =>
      Match.value(model.tool).pipe(
        withUpdateReturn,
        Match.when('Brush', () => ({
          model: evo(model, {
            grid: () => applyBrush(model, x, y),
            undoStack: () => pushHistory(model.undoStack, model.grid),
            redoStack: () => [],
            isDrawing: () => true,
          }),
        })),
        Match.when('Fill', () => {
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
            redoStack: Array.append(model.grid),
          })
          return { model: nextModel, commands: [saveCanvas(nextModel)] }
        },
      }),
    // ... 23 more handlers
  })
