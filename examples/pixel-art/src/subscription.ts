import { Effect, Layer, Match, Option, Schema, Stream } from 'effect'
import { Dom, Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

type UndoRedoMessage =
  | typeof Message.ClickedUndo.Type
  | typeof Message.ClickedRedo.Type

const toUndoRedoMessage = (
  event: KeyboardEvent,
): Option.Option<UndoRedoMessage> => {
  const isCtrlOrMeta = event.ctrlKey || event.metaKey
  if (!isCtrlOrMeta) {
    return Option.none()
  }

  return Match.value(event.key.toLowerCase()).pipe(
    Match.withReturnType<Option.Option<UndoRedoMessage>>(),
    Match.when('z', () =>
      Option.some(
        event.shiftKey ? Message.ClickedRedo() : Message.ClickedUndo(),
      ),
    ),
    Match.when('y', () => Option.some(Message.ClickedRedo())),
    Match.orElse(() => Option.none()),
  )
}

const toToolMessage = (
  event: KeyboardEvent,
): Option.Option<typeof Message.SelectedTool.Type> => {
  if (event.ctrlKey || event.metaKey) {
    return Option.none()
  }

  return Match.value(event.key.toLowerCase()).pipe(
    Match.withReturnType<Option.Option<typeof Message.SelectedTool.Type>>(),
    Match.when('b', () => Option.some(Message.SelectedTool({ tool: 'Brush' }))),
    Match.when('f', () => Option.some(Message.SelectedTool({ tool: 'Fill' }))),
    Match.when('e', () =>
      Option.some(Message.SelectedTool({ tool: 'Eraser' })),
    ),
    Match.orElse(() => Option.none()),
  )
}

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  undoRedoKeyPresses: entry('UndoRedoKeyPresses', {
    messages: [Message.ClickedUndo, Message.ClickedRedo],
  }),

  toolKeyPresses: entry('ToolKeyPresses', { messages: [Message.SelectedTool] }),

  mouseReleases: entry(
    'MouseReleases',
    { isDrawing: Schema.Boolean },
    {
      messages: [Message.ReleasedMouse],
      modelToDependencies: model => ({ isDrawing: model.isDrawing }),
    },
  ),
}))

const UndoRedoKeyPressesLayer = subscriptions.undoRedoKeyPresses.toLayer(
  Effect.succeed(() =>
    Dom.streamFromEventFilterMapPreventDefault({
      target: document,
      type: 'keydown',
      filterMapEvent: toUndoRedoMessage,
    }),
  ),
)

const ToolKeyPressesLayer = subscriptions.toolKeyPresses.toLayer(
  Effect.succeed(() =>
    Dom.streamFromEventFilterMap({
      target: document,
      type: 'keydown',
      filterMapEvent: toToolMessage,
    }),
  ),
)

const MouseReleasesLayer = subscriptions.mouseReleases.toLayer(
  Effect.succeed(({ isDrawing }) =>
    Stream.when(
      Stream.fromEventListener(document, 'mouseup').pipe(
        Stream.map(() => Message.ReleasedMouse()),
      ),
      Effect.sync(() => isDrawing),
    ),
  ),
)

export const SubscriptionsLayer = Layer.mergeAll(
  UndoRedoKeyPressesLayer,
  ToolKeyPressesLayer,
  MouseReleasesLayer,
)
