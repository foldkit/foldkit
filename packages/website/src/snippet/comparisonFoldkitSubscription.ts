import { Effect, Schema, Stream } from 'effect'
import { Dom } from 'foldkit'

import { toToolMessage, toUndoRedoMessage } from './keyboard'
import { Message } from './message'
import { pixelArt } from './update'

export const subscriptions = pixelArt.subscriptions(entry => ({
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
            Effect.succeed(isDrawing),
          )
      },
    },
  ),
}))
