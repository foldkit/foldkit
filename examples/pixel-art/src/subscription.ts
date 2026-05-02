import { Effect, Option, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import type { Message } from './message'
import {
  ClickedRedo,
  ClickedUndo,
  ReleasedMouse,
  SelectedTool,
} from './message'
import type { Model } from './model'

export const handleKeyboardEvent = (
  event: KeyboardEvent,
): Effect.Effect<Option.Option<Message>> =>
  Effect.sync(() => {
    const isCtrlOrMeta = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()

    if (isCtrlOrMeta && key === 'z') {
      event.preventDefault()
      return Option.some(event.shiftKey ? ClickedRedo() : ClickedUndo())
    }
    if (isCtrlOrMeta && key === 'y') {
      event.preventDefault()
      return Option.some(ClickedRedo())
    }

    if (!isCtrlOrMeta) {
      if (key === 'b') {
        return Option.some(SelectedTool({ tool: 'Brush' }))
      }
      if (key === 'f') {
        return Option.some(SelectedTool({ tool: 'Fill' }))
      }
      if (key === 'e') {
        return Option.some(SelectedTool({ tool: 'Eraser' }))
      }
    }
    return Option.none()
  })

export const SubscriptionDeps = S.Struct({
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
        Stream.filter(Option.isSome),
        Stream.map(option => option.value),
      ),
  },

  mouseRelease: {
    modelToDependencies: model => ({ isDrawing: model.isDrawing }),
    dependenciesToStream: ({ isDrawing }) =>
      Stream.when(
        Stream.fromEventListener(document, 'mouseup').pipe(
          Stream.map(() => ReleasedMouse()),
        ),
        Effect.sync(() => isDrawing),
      ),
  },
})
