export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  keyboard: Subscription.persistent(
    Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
      Stream.mapEffect(handleKeyboardEvent),
      Stream.filterMap(Function.identity),
    ),
  ),

  mouseRelease: entry(
    { isDrawing: S.Boolean },
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
