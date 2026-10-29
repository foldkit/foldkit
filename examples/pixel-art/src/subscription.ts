import { Effect, Match, Option, Schema, Stream } from 'effect'
import { Dom } from 'foldkit'

import { ApplicationDefinition } from './definition'
import { Message } from './message'
import type { ClickedRedo, ClickedUndo, SelectedTool } from './message'

type UndoRedoMessage = ClickedUndo | ClickedRedo

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

const toToolMessage = (event: KeyboardEvent): Option.Option<SelectedTool> => {
  if (event.ctrlKey || event.metaKey) {
    return Option.none()
  }

  return Match.value(event.key.toLowerCase()).pipe(
    Match.withReturnType<Option.Option<SelectedTool>>(),
    Match.when('b', () => Option.some(Message.SelectedTool({ tool: 'Brush' }))),
    Match.when('f', () => Option.some(Message.SelectedTool({ tool: 'Fill' }))),
    Match.when('e', () =>
      Option.some(Message.SelectedTool({ tool: 'Eraser' })),
    ),
    Match.orElse(() => Option.none()),
  )
}

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  undoRedoKeyPresses: entry('UndoRedoKeyPresses', {
    messages: [Message.ClickedUndo, Message.ClickedRedo],
    handler: function* () {
      return () =>
        Dom.streamFromEventFilterMapPreventDefault({
          target: document,
          type: 'keydown',
          filterMapEvent: toUndoRedoMessage,
        })
    },
  }),

  toolKeyPresses: entry('ToolKeyPresses', {
    messages: [Message.SelectedTool],
    handler: function* () {
      return () =>
        Dom.streamFromEventFilterMap({
          target: document,
          type: 'keydown',
          filterMapEvent: toToolMessage,
        })
    },
  }),

  mouseReleases: entry(
    'MouseReleases',
    { isDrawing: Schema.Boolean },
    {
      messages: [Message.ReleasedMouse],
      modelToDependencies: model => ({ isDrawing: model.isDrawing }),
      handler: function* () {
        return ({ isDrawing }) =>
          Stream.when(
            Stream.fromEventListener(document, 'mouseup').pipe(
              Stream.map(() => Message.ReleasedMouse()),
            ),
            Effect.sync(() => isDrawing),
          )
      },
    },
  ),
}))
