export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  undoRedoKeyPresses: entry(
    'UndoRedoKeyPresses',
    {
      messages: [ClickedUndo, ClickedRedo],
    },
    Effect.succeed(() =>
      Dom.streamFromEventFilterMapPreventDefault({
        target: document,
        type: 'keydown',
        filterMapEvent: toUndoRedoMessage,
      }),
    ),
  ),

  toolKeyPresses: entry(
    'ToolKeyPresses',
    {
      messages: [SelectedTool],
    },
    Effect.succeed(() =>
      Dom.streamFromEventFilterMap({
        target: document,
        type: 'keydown',
        filterMapEvent: toToolMessage,
      }),
    ),
  ),

  mouseReleases: entry(
    'MouseReleases',
    { isDrawing: Schema.Boolean },
    {
      messages: [ReleasedMouse],
      modelToDependencies: model => ({ isDrawing: model.isDrawing }),
    },
    Effect.succeed(({ isDrawing }) =>
      Stream.when(
        Stream.fromEventListener(document, 'mouseup').pipe(
          Stream.map(() => ReleasedMouse()),
        ),
        Effect.succeed(isDrawing),
      ),
    ),
  ),
}))
