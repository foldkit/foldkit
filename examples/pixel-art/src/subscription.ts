import { Effect, Layer, Match, Option, Schema, Stream } from 'effect'
import { Dom, Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

const toUndoRedoMessage = (event: KeyboardEvent): Option.Option<Message> => {
  const isCtrlOrMeta = event.ctrlKey || event.metaKey
  if (!isCtrlOrMeta) {
    return Option.none()
  }

  return Match.value(event.key.toLowerCase()).pipe(
    Match.withReturnType<Option.Option<Message>>(),
    Match.when('z', () =>
      Option.some(
        event.shiftKey ? Message.ClickedRedo() : Message.ClickedUndo(),
      ),
    ),
    Match.when('y', () => Option.some(Message.ClickedRedo())),
    Match.orElse(() => Option.none()),
  )
}

const toToolMessage = (event: KeyboardEvent): Option.Option<Message> => {
  if (event.ctrlKey || event.metaKey) {
    return Option.none()
  }

  return Match.value(event.key.toLowerCase()).pipe(
    Match.withReturnType<Option.Option<Message>>(),
    Match.when('b', () => Option.some(Message.SelectedTool({ tool: 'Brush' }))),
    Match.when('f', () => Option.some(Message.SelectedTool({ tool: 'Fill' }))),
    Match.when('e', () =>
      Option.some(Message.SelectedTool({ tool: 'Eraser' })),
    ),
    Match.orElse(() => Option.none()),
  )
}

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  undoRedoKeys: entry(
    'WatchUndoRedoKeys',
    {},
    {
      modelToDependencies: () => ({}),
    },
  ),

  toolKeys: entry(
    'WatchToolKeys',
    {},
    {
      modelToDependencies: () => ({}),
    },
  ),

  mouseRelease: entry(
    'WatchMouseRelease',
    { isDrawing: Schema.Boolean },
    {
      modelToDependencies: model => ({ isDrawing: model.isDrawing }),
    },
  ),
}))

export const SubscriptionsLive = Layer.mergeAll(
  subscriptions.undoRedoKeys.toLayer(() =>
    Dom.streamFromEventFilterMapPreventDefault({
      target: document,
      type: 'keydown',
      filterMapEvent: toUndoRedoMessage,
    }),
  ),
  subscriptions.toolKeys.toLayer(() =>
    Dom.streamFromEventFilterMap({
      target: document,
      type: 'keydown',
      filterMapEvent: toToolMessage,
    }),
  ),
  subscriptions.mouseRelease.toLayer(({ isDrawing }) =>
    Stream.when(
      Stream.fromEventListener(document, 'mouseup').pipe(
        Stream.map(() => Message.ReleasedMouse()),
      ),
      Effect.sync(() => isDrawing),
    ),
  ),
)
