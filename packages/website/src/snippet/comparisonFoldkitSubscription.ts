import { Stream } from 'effect'
import { Dom } from 'foldkit'

// Always on: the dependencies never change
export const keyPresses = {
  dependencies: () => null,
  stream: () =>
    Stream.merge(
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
    ),
}

// Gated by the Model: runs only while the user is drawing
export const mouseReleases = {
  dependencies: (model: Model) => model.isDrawing,
  stream: (isDrawing: boolean) =>
    isDrawing
      ? Stream.fromEventListener(document, 'mouseup').pipe(
          Stream.map(() => Message.ReleasedMouse()),
        )
      : Stream.empty,
}

// In the module the Application's Layer returns:
// return { subscriptions: { keyPresses, mouseReleases }, ... }
