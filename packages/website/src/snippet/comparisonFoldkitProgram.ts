// src/init.ts

import { ApplicationComposition } from './composition'

export const init = ApplicationComposition.makeInit((flags: Flags) => ({
  model: {
    grid: Option.match(flags.maybeSavedCanvas, {
      onNone: () => createEmptyGrid(DEFAULT_GRID_SIZE),
      onSome: ({ grid }) => grid,
    }),
    undoStack: [],
    redoStack: [],
    tool: 'Brush',
    mirrorMode: 'None',
    isDrawing: false,
    maybeHoveredCell: Option.none(),
    // remaining fields elided for brevity
  },
}))

// src/entry.ts

import { Runtime } from 'foldkit'

import { Flags, flags } from './flags'
import { init } from './init'
import { update } from './update'
import { view } from './view'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  Flags,
  container: document.getElementById('root'),
})

Runtime.run(application, { flags })
