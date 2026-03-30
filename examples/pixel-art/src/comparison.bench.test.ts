/**
 * Side-by-side benchmark: Foldkit update vs React reducer
 *
 * Run: pnpm --filter pixel-art-example exec vitest run src/comparison.bench.ts
 */
import { Option } from 'effect'
import { Ui } from 'foldkit'
import { test } from 'vitest'

import { createEmptyGrid as createReactGrid } from '../../../comparisons/pixel-art-react/src/grid'
import { reducer } from '../../../comparisons/pixel-art-react/src/reducer'
import type { State } from '../../../comparisons/pixel-art-react/src/types'
import { createEmptyGrid as createFoldkitGrid } from './grid'
import {
  ClickedRedo as FoldkitClickedRedo,
  ClickedUndo as FoldkitClickedUndo,
  EnteredCell as FoldkitEnteredCell,
  PressedCell as FoldkitPressedCell,
  ReleasedMouse as FoldkitReleasedMouse,
} from './message'
import type { Model } from './model'
import { update } from './update'

const GRID_SIZE = 16
const ITERATIONS = 10_000
const WARMUP = 500

const foldkitModel: Model = {
  grid: createFoldkitGrid(GRID_SIZE),
  undoStack: [],
  redoStack: [],
  selectedColorIndex: 0,
  gridSize: GRID_SIZE,
  tool: 'Brush' as const,
  mirrorMode: 'None' as const,
  isDrawing: false,
  maybeHoveredCell: Option.none(),
  errorDialog: Ui.Dialog.init({ id: 'error-dialog' }),
  maybeExportError: Option.none(),
  paletteThemeIndex: 0,
  gridSizeConfirmDialog: Ui.Dialog.init({ id: 'confirm-dialog' }),
  maybePendingGridSize: Option.none(),
  toolRadioGroup: Ui.RadioGroup.init({
    id: 'tools',
    selectedValue: 'Brush',
  }),
  gridSizeRadioGroup: Ui.RadioGroup.init({
    id: 'sizes',
    selectedValue: String(GRID_SIZE),
    orientation: 'Horizontal',
  }),
  paletteRadioGroup: Ui.RadioGroup.init({
    id: 'palette',
    selectedValue: '0',
    orientation: 'Horizontal',
  }),
  mirrorHorizontalSwitch: Ui.Switch.init({ id: 'mirror-h' }),
  mirrorVerticalSwitch: Ui.Switch.init({ id: 'mirror-v' }),
  themeListbox: Ui.Listbox.init({ id: 'themes', selectedItem: '0' }),
}

const reactState: State = {
  grid: createReactGrid(GRID_SIZE),
  undoStack: [],
  redoStack: [],
  selectedColorIndex: 0,
  gridSize: GRID_SIZE,
  tool: 'Brush',
  mirrorMode: 'None',
  isDrawing: false,
  hoveredCell: null,
  paletteThemeIndex: 0,
  exportError: null,
  isErrorDialogOpen: false,
  pendingGridSize: null,
  isGridSizeDialogOpen: false,
}

const buildFoldkitHistory = (steps: number): Model => {
  let model = foldkitModel
  for (let i = 0; i < steps; i++) {
    const x = i % GRID_SIZE
    const y = Math.floor(i / GRID_SIZE) % GRID_SIZE
    ;[model] = update(model, FoldkitPressedCell({ x, y }))
    ;[model] = update(model, FoldkitReleasedMouse())
  }
  return model
}

const buildReactHistory = (steps: number): State => {
  let state = reactState
  for (let i = 0; i < steps; i++) {
    const x = i % GRID_SIZE
    const y = Math.floor(i / GRID_SIZE) % GRID_SIZE
    state = reducer(state, { type: 'PressedCell', x, y })
    state = reducer(state, { type: 'ReleasedMouse' })
  }
  return state
}

const timeMs = (iterations: number, fn: () => void): number => {
  for (let i = 0; i < WARMUP; i++) {
    fn()
  }
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  return performance.now() - start
}

const formatUs = (totalMs: number, iterations: number): string => {
  const us = (totalMs / iterations) * 1000
  if (us >= 100) {
    return `${us.toFixed(0)}\u00b5s`
  }
  if (us >= 1) {
    return `${us.toFixed(1)}\u00b5s`
  }
  return `${(us * 1000).toFixed(0)}ns`
}

const pad = (text: string, width: number): string => text.padEnd(width)
const padR = (text: string, width: number): string => text.padStart(width)

test('benchmark', () => {
  const foldkitWith20 = buildFoldkitHistory(20)
  const reactWith20 = buildReactHistory(20)

  const benchmarks: ReadonlyArray<
    Readonly<{ name: string; foldkit: () => void; react: () => void }>
  > = [
    {
      name: 'Brush stroke',
      foldkit: () => {
        const [m] = update(foldkitModel, FoldkitPressedCell({ x: 5, y: 5 }))
        update(m, FoldkitReleasedMouse())
      },
      react: () => {
        const s = reducer(reactState, { type: 'PressedCell', x: 5, y: 5 })
        reducer(s, { type: 'ReleasedMouse' })
      },
    },
    {
      name: 'Brush drag (5 cells)',
      foldkit: () => {
        let [m] = update(foldkitModel, FoldkitPressedCell({ x: 0, y: 0 }))
        ;[m] = update(m, FoldkitEnteredCell({ x: 1, y: 0 }))
        ;[m] = update(m, FoldkitEnteredCell({ x: 2, y: 0 }))
        ;[m] = update(m, FoldkitEnteredCell({ x: 3, y: 0 }))
        ;[m] = update(m, FoldkitEnteredCell({ x: 4, y: 0 }))
        update(m, FoldkitReleasedMouse())
      },
      react: () => {
        let s = reducer(reactState, { type: 'PressedCell', x: 0, y: 0 })
        s = reducer(s, { type: 'EnteredCell', x: 1, y: 0 })
        s = reducer(s, { type: 'EnteredCell', x: 2, y: 0 })
        s = reducer(s, { type: 'EnteredCell', x: 3, y: 0 })
        s = reducer(s, { type: 'EnteredCell', x: 4, y: 0 })
        reducer(s, { type: 'ReleasedMouse' })
      },
    },
    {
      name: 'Flood fill (16\u00d716)',
      foldkit: () => {
        const m: Model = { ...foldkitModel, tool: 'Fill' as const }
        update(m, FoldkitPressedCell({ x: 0, y: 0 }))
      },
      react: () => {
        const s: State = { ...reactState, tool: 'Fill' }
        reducer(s, { type: 'PressedCell', x: 0, y: 0 })
      },
    },
    {
      name: 'Single undo (20 entries)',
      foldkit: () => {
        update(foldkitWith20, FoldkitClickedUndo())
      },
      react: () => {
        reducer(reactWith20, { type: 'ClickedUndo' })
      },
    },
    {
      name: '5\u00d7 undo + 5\u00d7 redo',
      foldkit: () => {
        let m = foldkitWith20
        for (let i = 0; i < 5; i++) {
          ;[m] = update(m, FoldkitClickedUndo())
        }
        for (let i = 0; i < 5; i++) {
          ;[m] = update(m, FoldkitClickedRedo())
        }
      },
      react: () => {
        let s = reactWith20
        for (let i = 0; i < 5; i++) {
          s = reducer(s, { type: 'ClickedUndo' })
        }
        for (let i = 0; i < 5; i++) {
          s = reducer(s, { type: 'ClickedRedo' })
        }
      },
    },
  ]

  console.log('')
  console.log(
    `  Pixel Art Editor \u2014 State Update Benchmark (${ITERATIONS.toLocaleString()} iterations, ${GRID_SIZE}\u00d7${GRID_SIZE} grid)`,
  )
  console.log('')
  console.log(
    `  ${pad('Operation', 28)} ${padR('Foldkit', 10)} ${padR('React', 10)}`,
  )
  console.log(`  ${'─'.repeat(48)}`)

  for (const b of benchmarks) {
    const foldkitMs = timeMs(ITERATIONS, b.foldkit)
    const reactMs = timeMs(ITERATIONS, b.react)
    console.log(
      `  ${pad(b.name, 28)} ${padR(formatUs(foldkitMs, ITERATIONS), 10)} ${padR(formatUs(reactMs, ITERATIONS), 10)}`,
    )
  }

  console.log('')
})
