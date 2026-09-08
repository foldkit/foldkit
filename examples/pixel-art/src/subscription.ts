import { Effect, Option, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

export const handleKeyboardEvent = (
  event: KeyboardEvent,
): Effect.Effect<Option.Option<Message>> =>
  Effect.sync(() => {
    const isCtrlOrMeta = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()

    if (isCtrlOrMeta && key === 'z') {
      event.preventDefault()
      return Option.some(
        event.shiftKey ? Message.ClickedRedo() : Message.ClickedUndo(),
      )
    }
    if (isCtrlOrMeta && key === 'y') {
      event.preventDefault()
      return Option.some(Message.ClickedRedo())
    }

    if (!isCtrlOrMeta) {
      if (key === 'b') {
        return Option.some(Message.SelectedTool({ tool: 'Brush' }))
      }
      if (key === 'f') {
        return Option.some(Message.SelectedTool({ tool: 'Fill' }))
      }
      if (key === 'e') {
        return Option.some(Message.SelectedTool({ tool: 'Eraser' }))
      }
    }
    return Option.none()
  })

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  keyboard: Subscription.persistent(
    Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
      Stream.mapEffect(handleKeyboardEvent),
      Stream.filter(Option.isSome),
      Stream.map(option => option.value),
    ),
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
