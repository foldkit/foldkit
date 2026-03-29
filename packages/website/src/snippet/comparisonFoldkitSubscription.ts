const SubscriptionDeps = S.Struct({
  keyboard: S.Null,
  mouseRelease: S.Struct({ isDrawing: S.Boolean }),
})

export const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  keyboard: {
    modelToDependencies: () => null,
    dependenciesToStream: () =>
      Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
        Stream.mapEffect(handleKeyboardEvent),
        Stream.filterMap(Function.identity),
      ),
  },

  mouseRelease: {
    modelToDependencies: model => ({ isDrawing: model.isDrawing }),
    dependenciesToStream: ({ isDrawing }) =>
      Stream.when(
        Stream.fromEventListener(document, 'mouseup').pipe(
          Stream.map(() => ReleasedMouse()),
        ),
        () => isDrawing,
      ),
  },
})
