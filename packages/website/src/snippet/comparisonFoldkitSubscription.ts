export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  undoRedoKeys: Subscription.fromStream(
    Browser.streamFromEventFilterMapPreventDefault({
      target: document,
      type: 'keydown',
      filterMapEvent: toUndoRedoMessage,
    }),
  ),

  toolKeys: Subscription.fromStream(
    Browser.streamFromEventFilterMap({
      target: document,
      type: 'keydown',
      filterMapEvent: toToolMessage,
    }),
  ),

  mouseRelease: entry(
    { isDrawing: Schema.Boolean },
    {
      modelToDependencies: model => ({ isDrawing: model.isDrawing }),
      dependenciesToStream: ({ isDrawing }) =>
        Stream.when(
          Stream.fromEventListener(document, 'mouseup').pipe(
            Stream.map(() => ReleasedMouse()),
          ),
          Effect.sync(() => isDrawing),
        ),
    },
  ),
}))
