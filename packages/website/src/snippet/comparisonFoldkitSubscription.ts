export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  undoRedoKeys: Subscription.persistent(
    Subscription.fromEventFilterMapPreventDefault({
      target: document,
      type: 'keydown',
      toMessage: toUndoRedoMessage,
    }),
  ),

  toolKeys: Subscription.persistent(
    Subscription.fromEventFilterMap({
      target: document,
      type: 'keydown',
      toMessage: toToolMessage,
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
