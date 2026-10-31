import { Stream } from 'effect'
import { Dom } from 'foldkit'

// Always on: the Application's `stream`
export const keyPresses = Stream.merge(
  Dom.streamFromEventFilterMapPreventDefault({
    target: document,
    type: 'keydown',
    filterMapEvent: toUndoRedoMessage,
  }),
  Dom.streamFromEventFilterMap({
    target: document,
    type: 'keydown',
    filterMapEvent: toToolMessage,
  }),
)

// Gated by the Model: an entry under `subscriptions`
export const mouseReleases = {
  dependencies: (model: Model) => model.isDrawing,
  stream: (isDrawing: boolean) =>
    isDrawing
      ? Stream.fromEventListener(document, 'mouseup').pipe(
          Stream.map(() => Message.ReleasedMouse()),
        )
      : Stream.empty,
}

// In the Application constructor:
// return { stream: keyPresses, subscriptions: { mouseReleases }, ... }
