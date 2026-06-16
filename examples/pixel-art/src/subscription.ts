import { Effect, Option, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Dialog } from '@foldkit/ui'

import type { Message } from './message'
import {
  ClickedRedo,
  ClickedUndo,
  GotErrorDialogMessage,
  GotGridSizeConfirmDialogMessage,
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

const appSubscriptions = Subscription.make<Model, Message>()(entry => ({
  keyboard: Subscription.persistent(
    Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
      Stream.mapEffect(handleKeyboardEvent),
      Stream.filter(Option.isSome),
      Stream.map(option => option.value),
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

const errorDialogSubscriptions = Subscription.lift({
  errorDialogLockScroll: Dialog.subscriptions.lockScroll,
})<Model, Message>({
  toChildModel: model => model.errorDialog,
  toParentMessage: message => GotErrorDialogMessage({ message }),
})

const gridSizeConfirmDialogSubscriptions = Subscription.lift({
  gridSizeConfirmDialogLockScroll: Dialog.subscriptions.lockScroll,
})<Model, Message>({
  toChildModel: model => model.gridSizeConfirmDialog,
  toParentMessage: message => GotGridSizeConfirmDialogMessage({ message }),
})

export const subscriptions = Subscription.aggregate<Model, Message>()(
  appSubscriptions,
  errorDialogSubscriptions,
  gridSizeConfirmDialogSubscriptions,
)
