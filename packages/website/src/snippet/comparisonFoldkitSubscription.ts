export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  undoRedoKeyPresses: entry('UndoRedoKeyPresses', {
    messages: [ClickedUndo, ClickedRedo],
  }),

  toolKeyPresses: entry('ToolKeyPresses', {
    messages: [SelectedTool],
  }),

  mouseReleases: entry(
    'MouseReleases',
    { isDrawing: Schema.Boolean },
    {
      messages: [ReleasedMouse],
      modelToDependencies: model => ({ isDrawing: model.isDrawing }),
    },
  ),
}))

const UndoRedoKeyPressesLayer = subscriptions.undoRedoKeyPresses.toLayer(
  Effect.succeed(() =>
    Dom.streamFromEventFilterMapPreventDefault({
      target: document,
      type: 'keydown',
      filterMapEvent: toUndoRedoMessage,
    }),
  ),
)

const ToolKeyPressesLayer = subscriptions.toolKeyPresses.toLayer(
  Effect.succeed(() =>
    Dom.streamFromEventFilterMap({
      target: document,
      type: 'keydown',
      filterMapEvent: toToolMessage,
    }),
  ),
)

const MouseReleasesLayer = subscriptions.mouseReleases.toLayer(
  Effect.succeed(({ isDrawing }) =>
    Stream.when(
      Stream.fromEventListener(document, 'mouseup').pipe(
        Stream.map(() => ReleasedMouse()),
      ),
      Effect.succeed(isDrawing),
    ),
  ),
)
