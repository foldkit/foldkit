import { Effect } from 'effect'
import { Document } from 'foldkit/html'
import { makeProgram } from 'foldkit/runtime'
import { describe, it } from 'vitest'

// Internal API not on the public surface but needed by the profile harness
// to capture the runtime's sync dispatcher.
import { __requireDispatch } from '../../../packages/foldkit/src/html/index.js'
import {
  AddedTodo,
  DeletedTodo,
  Model,
  ToggledTodo,
  UpdatedNewTodo,
  update as baseUpdate,
  init,
} from './main.js'
import type { Todo } from './main.js'
import { view as naiveView } from './main.js'
import { view as optimisedView } from './main.optimised.js'

/**
 * Phase-level profile of the lustre-benchmark optimised TodoMVC runbook.
 *
 * The lustre-labs/benchmark harness runs the same runbook (add 100 todos,
 * toggle each, destroy the first 100 times) against every framework and
 * reports total wall-clock. That total tells you Foldkit lands at 376 ms vs
 * Elm at 98 ms but not WHY. This profile drives the same Message sequence
 * directly into the runtime, with wrappers around `view` and `update` that
 * accumulate per-phase time. Patch + dispatch + everything else falls out as
 * `total - view - update`.
 *
 * Run with:
 *
 *   pnpm --filter @foldkit/lustre-benchmark run profile
 *
 * For a CPU flamegraph of the same run:
 *
 *   cd internal/lustre-benchmark
 *   RUN_LUSTRE_PROFILE=1 node --cpu-prof --cpu-prof-dir=. \
 *     node_modules/vitest/dist/cli.js run
 *
 * The second `.cpuprofile` written (the larger of the two) is the worker
 * fork that ran the test. Open it in Chrome DevTools (Performance tab,
 * "Load profile") to get a self-time and call-tree view.
 */

const isProfileEnabled = process.env['RUN_LUSTRE_PROFILE'] === '1'

const TODO_COUNT = 100

type Wrapped<F> = {
  readonly fn: F
  readonly totalMs: () => number
  readonly callCount: () => number
  readonly reset: () => void
}

const wrap = <Args extends ReadonlyArray<unknown>, Return>(
  fn: (...args: Args) => Return,
): Wrapped<(...args: Args) => Return> => {
  let total = 0
  let calls = 0
  return {
    fn: (...args: Args): Return => {
      const start = performance.now()
      const result = fn(...args)
      total += performance.now() - start
      calls += 1
      return result
    },
    totalMs: () => total,
    callCount: () => calls,
    reset: () => {
      total = 0
      calls = 0
    },
  }
}

const nextFrame = (): Promise<void> =>
  new Promise(resolve => requestAnimationFrame(() => resolve()))

const waitForCondition = async (
  predicate: () => boolean,
  timeoutMs = 5_000,
): Promise<void> => {
  const start = performance.now()
  while (!predicate()) {
    if (performance.now() - start > timeoutMs) {
      throw new Error('waitForCondition timeout')
    }
    await new Promise<void>(resolve => setTimeout(resolve, 0))
  }
}

type Profile = Readonly<{
  totalMs: number
  viewMs: number
  viewCalls: number
  updateMs: number
  updateCalls: number
  inferredOtherMs: number
}>

const runProfile = async (
  baseView: (model: Model) => Document,
): Promise<Profile> => {
  const container = document.createElement('section')
  container.id = `profile-${Math.random().toString(36).slice(2)}`
  container.className = 'todoapp'
  document.body.appendChild(container)

  let capturedDispatch: ((message: unknown) => void) | null = null
  let latestModel: Model | null = null

  const wrappedView = wrap(baseView)
  const wrappedUpdate = wrap(baseUpdate)

  const captureView = (model: Model) => {
    if (capturedDispatch === null) {
      capturedDispatch = __requireDispatch()
    }
    latestModel = model
    return wrappedView.fn(model)
  }

  const program = makeProgram({
    Model,
    init,
    update: wrappedUpdate.fn,
    view: captureView,
    container,
    devTools: false,
    freezeModel: false,
  })

  Effect.runFork(program.start())

  await waitForCondition(() => capturedDispatch !== null)

  // Pump the init render so wrappers start clean.
  await nextFrame()
  wrappedView.reset()
  wrappedUpdate.reset()

  const dispatch = capturedDispatch!
  const getModel = (): Model => latestModel!

  const totalStart = performance.now()

  // PHASE 1: add 100 todos. Each "add" matches a user typing into .new-todo
  // and pressing Enter, then a Command resolving to GeneratedTodo. We
  // dispatch the equivalent Message sequence and await the next render so
  // the runtime processes the queue exactly like the harness's event-driven
  // path.
  for (let index = 0; index < TODO_COUNT; index++) {
    dispatch(UpdatedNewTodo({ text: `Todo ${index}` }))
    dispatch(AddedTodo())
    await waitForCondition(() => getModel().todos.length === index + 1)
    await nextFrame()
  }

  // PHASE 2: toggle every todo.
  const todoIds: ReadonlyArray<string> = getModel().todos.map(
    (todo: Todo) => todo.id,
  )
  for (const id of todoIds) {
    dispatch(ToggledTodo({ id }))
    await nextFrame()
  }

  // PHASE 3: destroy the first todo 100 times.
  for (let index = 0; index < TODO_COUNT; index++) {
    const firstId = getModel().todos[0]?.id
    if (firstId === undefined) {
      break
    }
    dispatch(DeletedTodo({ id: firstId }))
    await nextFrame()
  }

  const totalMs = performance.now() - totalStart

  const viewMs = wrappedView.totalMs()
  const viewCalls = wrappedView.callCount()
  const updateMs = wrappedUpdate.totalMs()
  const updateCalls = wrappedUpdate.callCount()
  const inferredOtherMs = totalMs - viewMs - updateMs

  return {
    totalMs,
    viewMs,
    viewCalls,
    updateMs,
    updateCalls,
    inferredOtherMs,
  }
}

const median = (numbers: ReadonlyArray<number>): number => {
  const sorted = [...numbers].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

const printRow = (
  label: string,
  value: number,
  total: number,
  unit = 'ms',
): void => {
  const percent = total > 0 ? (value / total) * 100 : 0
  /* eslint-disable-next-line no-console */
  console.log(
    `  ${label.padEnd(28)} ${value.toFixed(1).padStart(8)} ${unit}  (${percent.toFixed(1).padStart(5)}%)`,
  )
}

const reportSlot = async (
  label: string,
  view: (model: Model) => Document,
  warmupRuns: number,
  measuredRuns: number,
): Promise<Profile> => {
  for (let index = 0; index < warmupRuns; index++) {
    await runProfile(view)
  }

  const profiles: Array<Profile> = []
  for (let index = 0; index < measuredRuns; index++) {
    profiles.push(await runProfile(view))
  }

  const aggregate: Profile = {
    totalMs: median(profiles.map(p => p.totalMs)),
    viewMs: median(profiles.map(p => p.viewMs)),
    viewCalls: profiles[0]!.viewCalls,
    updateMs: median(profiles.map(p => p.updateMs)),
    updateCalls: profiles[0]!.updateCalls,
    inferredOtherMs: median(profiles.map(p => p.inferredOtherMs)),
  }

  /* eslint-disable no-console */
  console.log('')
  console.log(`--- ${label} ---`)
  printRow('total wall-clock', aggregate.totalMs, aggregate.totalMs)
  printRow('view (user)', aggregate.viewMs, aggregate.totalMs)
  printRow('update (user)', aggregate.updateMs, aggregate.totalMs)
  printRow(
    'patch + dispatch + other',
    aggregate.inferredOtherMs,
    aggregate.totalMs,
  )
  console.log(
    `  view calls:   ${aggregate.viewCalls.toString().padStart(4)}    avg view:   ${(aggregate.viewMs / aggregate.viewCalls).toFixed(3)}ms`,
  )
  console.log(
    `  update calls: ${aggregate.updateCalls.toString().padStart(4)}    avg update: ${(aggregate.updateMs / aggregate.updateCalls).toFixed(3)}ms`,
  )
  /* eslint-enable no-console */

  return aggregate
}

describe.skipIf(!isProfileEnabled)('lustre runbook phase profile', () => {
  it(
    'compares naive, optimised, and optimised-with-list views',
    { timeout: 300_000 },
    async () => {
      const WARMUP_RUNS = 1
      const MEASURED_RUNS = 5

      /* eslint-disable no-console */
      console.log('')
      console.log(
        `[lustre profile] runbook = 100 add + 100 toggle + 100 destroy`,
      )
      console.log(
        `[lustre profile] median over ${MEASURED_RUNS} runs (warmup ${WARMUP_RUNS})`,
      )
      /* eslint-enable no-console */

      const naive = await reportSlot(
        'naive (no memoization)',
        naiveView,
        WARMUP_RUNS,
        MEASURED_RUNS,
      )
      const optimised = await reportSlot(
        'optimised (createKeyedLazy + createLazy)',
        optimisedView,
        WARMUP_RUNS,
        MEASURED_RUNS,
      )

      /* eslint-disable no-console */
      console.log('')
      console.log(`--- summary ---`)
      console.log(`  naive    : ${naive.totalMs.toFixed(1)} ms`)
      console.log(`  optimised: ${optimised.totalMs.toFixed(1)} ms`)
      console.log('')
      /* eslint-enable no-console */
    },
  )
})
