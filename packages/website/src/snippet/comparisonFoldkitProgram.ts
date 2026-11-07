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

// src/application.ts

import { Block, Program, Runtime } from 'foldkit'

import { init } from './init'
import type { Model } from './model'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
  view,
})

// src/entry.ts

import { ApplicationBlock } from './block'
import { Flags, flags } from './flags'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  Flags,
  container: document.getElementById('root'),
})

Runtime.run(program, { flags })

export { ApplicationBlock } from './block'
