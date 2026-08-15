import { Effect, Option, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

const toUndoRedoMessage = (event: KeyboardEvent): Option.Option<Message> => {
  const isCtrlOrMeta = event.ctrlKey || event.metaKey
  if (!isCtrlOrMeta) {
    return Option.none()
  }

  const key = event.key.toLowerCase()
  if (key === 'z') {
    return Option.some(
      event.shiftKey ? Message.ClickedRedo() : Message.ClickedUndo(),
    )
  }
  if (key === 'y') {
    return Option.some(Message.ClickedRedo())
  }
  return Option.none()
}

const toToolMessage = (event: KeyboardEvent): Option.Option<Message> => {
  if (event.ctrlKey || event.metaKey) {
    return Option.none()
  }

  const key = event.key.toLowerCase()
  if (key === 'b') {
    return Option.some(Message.SelectedTool({ tool: 'Brush' }))
  }
  if (key === 'f') {
    return Option.some(Message.SelectedTool({ tool: 'Fill' }))
  }
  if (key === 'e') {
    return Option.some(Message.SelectedTool({ tool: 'Eraser' }))
  }
  return Option.none()
}

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  undoRedoKeys: Subscription.persistent(
    Subscription.fromEventPreventDefault<KeyboardEvent, Message>({
      target: document,
      type: 'keydown',
      toMessage: toUndoRedoMessage,
    }),
  ),

  toolKeys: Subscription.persistent(
    Subscription.fromEventFilterMap<KeyboardEvent, Message>({
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
            Stream.map(() => Message.ReleasedMouse()),
          ),
          Effect.sync(() => isDrawing),
        ),
    },
  ),
}))
