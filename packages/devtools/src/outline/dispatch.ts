import { Match } from 'effect'

import { OutlineCommand } from './commands.js'
import type { OutlinePainter } from './painter.js'

export const dispatchOutlineCommand = (
  command: OutlineCommand,
  painter: OutlinePainter,
  enabled: boolean,
): void => {
  const shouldProcess =
    enabled || command._tag === 'Clear' || command._tag === 'SetVisible'
  if (!shouldProcess) {
    return
  }

  Match.value(command).pipe(
    Match.tagsExhaustive({
      PushRects: ({ rects }) => {
        if (rects.length === 0) {
          return
        }
        painter.pushRects(rects)
      },
      Scroll: ({ deltaX, deltaY }) => painter.applyScroll(deltaX, deltaY),
      Resize: ({ width, height, dpr }) => painter.resize(width, height, dpr),
      Clear: () => painter.clear(),
      SetVisible: ({ visible }) => painter.setVisible(visible),
    }),
  )
}
