import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'
it.effect('undo restores the previous grid state', () =>
  story(
    { block: ApplicationBlock, layer },
    given(emptyModel),
    message(PressedCell({ x: 0, y: 0 })),
    message(ReleasedMouse()),
    Command.resolve(SaveCanvas, CompletedSaveCanvas()),
    model(model => {
      expect(model.grid[0]?.[0]).toEqual(Option.some(0))
      expect(model.undoStack).toHaveLength(1)
    }),
    message(ClickedUndo()),
    Command.resolve(SaveCanvas, CompletedSaveCanvas()),
    model(model => {
      expect(model.grid[0]?.[0]).toEqual(Option.none())
      expect(model.undoStack).toHaveLength(0)
      expect(model.redoStack).toHaveLength(1)
    }),
  ),
)
import { it } from '@effect/vitest'
