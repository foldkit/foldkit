import { Effect, Match, Option, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

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
  undoRedoKeys: Subscription.persistent(
    Subscription.fromEventFilterMapPreventDefault({
      target: document,
      type: 'keydown',
      filterMapEvent: toUndoRedoMessage,
    }),
  ),

  toolKeys: Subscription.persistent(
    Subscription.fromEventFilterMap({
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
            Stream.map(() => Message.ReleasedMouse()),
          ),
          Effect.sync(() => isDrawing),
        ),
    },
  ),
}))
