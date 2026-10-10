export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  undoRedoKeyPresses: entry('UndoRedoKeyPresses', {
    messages: [ClickedUndo, ClickedRedo],
    handler: function* () {
      return () =>
        Dom.streamFromEventFilterMapPreventDefault({
          target: document,
          type: 'keydown',
          filterMapEvent: toUndoRedoMessage,
        })
    },
  }),

  toolKeyPresses: entry('ToolKeyPresses', {
    messages: [SelectedTool],
    handler: function* () {
      return () =>
        Dom.streamFromEventFilterMap({
          target: document,
          type: 'keydown',
          filterMapEvent: toToolMessage,
        })
    },
  }),

  mouseReleases: entry(
    'MouseReleases',
    { isDrawing: Schema.Boolean },
    {
      messages: [ReleasedMouse],
      modelToDependencies: model => ({ isDrawing: model.isDrawing }),
      handler: function* () {
        return ({ isDrawing }) =>
          Stream.when(
            Stream.fromEventListener(document, 'mouseup').pipe(
              Stream.map(() => ReleasedMouse()),
            ),
            Effect.succeed(isDrawing),
          )
      },
    },
  ),
}))
