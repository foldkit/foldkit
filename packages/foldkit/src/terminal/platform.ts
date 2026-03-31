import { NodeRuntime } from '@effect/platform-node'
import { Effect, Option } from 'effect'

import { Dispatch } from '../runtime/dispatch'
import * as Ansi from './ansi'
import type { CellGrid } from './cell'
import { layout } from './layout'
import type { TerminalNode } from './view'
import { emptyAttributes } from './view'

/** The render state maintained between frames. */
export type TerminalRenderState = Readonly<{
  grid: CellGrid
  width: number
  height: number
}>

/** Target for terminal rendering — uses stdout dimensions. */
export type TerminalTarget = Readonly<{
  write: (data: string) => void
  columns: number
  rows: number
}>

const createTarget = (): TerminalTarget => ({
  write: (data: string) => {
    process.stdout.write(data)
  },
  columns: process.stdout.columns,
  rows: process.stdout.rows,
})

const emptyBox: TerminalNode = {
  _tag: 'Box',
  attributes: emptyAttributes,
  children: [],
}

/** Render a TerminalNode to the terminal, diffing against the previous state. */
const render = (
  previous: Option.Option<TerminalRenderState>,
  next: TerminalNode | null,
  target: TerminalTarget,
): TerminalRenderState => {
  const nextNode = next ?? emptyBox

  const nextGrid = layout(nextNode, target.columns, target.rows)

  const output = Option.match(previous, {
    onNone: () => Ansi.renderFull(nextGrid),
    onSome: ({ grid: previousGrid }) =>
      Ansi.renderDiff(previousGrid, nextGrid),
  })

  target.write(output)

  return {
    grid: nextGrid,
    width: target.columns,
    height: target.rows,
  }
}

const setTitle = (title: string): void => {
  process.stdout.write(`\x1b]2;${title}\x07`)
}

const provideDispatch = <A>(
  effect: Effect.Effect<A, never, Dispatch>,
  dispatch: {
    readonly dispatchAsync: (message: unknown) => Effect.Effect<void>
    readonly dispatchSync: (message: unknown) => void
  },
): Effect.Effect<A> => Effect.provideService(effect, Dispatch, dispatch)

const runMain = (effect: Effect.Effect<void>): void => {
  process.stdout.write(Ansi.enterAltScreen + Ansi.clearScreen)

  const cleanup = () => {
    process.stdout.write(Ansi.showCursor + Ansi.exitAltScreen)
    process.exit(0)
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
  process.on('exit', () => {
    process.stdout.write(Ansi.showCursor + Ansi.exitAltScreen)
  })

  NodeRuntime.runMain(effect)
}

export const Terminal = {
  render,
  setTitle,
  provideDispatch,
  runMain,
} as const

export { createTarget }
