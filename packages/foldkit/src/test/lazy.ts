import { Array, Context, Effect, Predicate, pipe } from 'effect'

import {
  __beginRender as beginHtmlRender,
  __clearRuntime as clearHtmlRuntime,
  __createBoundaryRegistry as createHtmlBoundaryRegistry,
  __htmlBuilder as htmlBuilderFor,
  __setRuntime as setHtmlRuntime,
} from '../html/index.js'
import type { Document, Html, HtmlBuilder } from '../html/index.js'
import {
  LazyMissReason,
  type LazyResolution,
  observeLazyResolutions,
} from '../html/lazy.js'
import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/dispatch.js'

type LazyMiss = Readonly<{
  slotId: number
  key: PropertyKey | undefined
  reason: LazyMissReason
}>

const noOpDispatch = Dispatch.of({
  dispatchAsync: () => Effect.void,
  dispatchSync: () => {},
})

const lazyContext = Context.make(Dispatch, noOpDispatch).pipe(
  Context.add(MountTracker, {
    started: () => {},
    ended: () => {},
  }),
)

const REASON_HINTS: Record<LazyMissReason['_tag'], string> = {
  NoCachedEntry:
    'Create the slot at module scope. Use a stable key for each rendered item or position.',
  FunctionChanged:
    'Pass the same view function for each slot or key. Define it outside view.',
  FrameChanged: 'Use separate slots or keys for different Submodel boundaries.',
  ArgumentCountChanged:
    'Pass the same number of arguments to each slot or key.',
  ArgumentsChanged:
    'Reuse the same objects, arrays, and functions when their values have not changed.',
}

const formatKey = (key: PropertyKey): string =>
  Predicate.isString(key) ? JSON.stringify(key) : String(key)

const formatReason = LazyMissReason.$match({
  NoCachedEntry: () => 'NoCachedEntry',
  FunctionChanged: () => 'FunctionChanged',
  FrameChanged: () => 'FrameChanged',
  ArgumentCountChanged: ({ previousCount, currentCount }) =>
    `ArgumentCountChanged from ${previousCount} to ${currentCount}`,
  ArgumentsChanged: ({ indices }) =>
    `ArgumentsChanged at ${indices.length === 1 ? 'index' : 'indices'} ${indices.join(', ')}`,
})

const formatMiss = ({ slotId, key, reason }: LazyMiss): string =>
  key === undefined
    ? `  slot ${slotId}: ${formatReason(reason)}`
    : `  slot ${slotId}, key ${formatKey(key)}: ${formatReason(reason)}`

const formatFailure = (misses: ReadonlyArray<LazyMiss>): string => {
  const missCount =
    misses.length === 1
      ? '1 lazy cache miss'
      : `${misses.length} lazy cache misses`
  const hints = pipe(
    misses,
    Array.map(({ reason }) => reason._tag),
    Array.dedupe,
    Array.map(tag => `  ${tag}: ${REASON_HINTS[tag]}`),
  )

  return [
    `${missCount} on the second render with the same Model:`,
    '',
    ...Array.map(misses, formatMiss),
    '',
    ...hints,
  ].join('\n')
}

const toMisses = (
  resolutions: ReadonlyArray<LazyResolution>,
): ReadonlyArray<LazyMiss> => {
  const slotIds = new Map<object, number>()
  const misses: Array<LazyMiss> = []

  for (const { slot, key, missReason } of resolutions) {
    const slotId = slotIds.get(slot) ?? slotIds.size + 1
    slotIds.set(slot, slotId)

    if (missReason !== undefined) {
      misses.push({ slotId, key, reason: missReason })
    }
  }

  return misses
}

/** Checks lazy cache reuse by rendering `view` twice with the same `model`.
 *  Throws if a lazy call misses its cache on the second render. The error
 *  identifies each slot, includes the key for keyed calls, and explains the
 *  miss. `ArgumentsChanged` also lists the changed argument indices. Slot
 *  numbers identify lazy instances in the order they are first called on
 *  the second render.
 *
 *  Throws when the second render makes no lazy calls. Supply a Model that
 *  renders the memoized content to test. Check states that render different
 *  content separately. When an outer lazy cache hit skips a child view,
 *  test the child view directly to check its lazy calls.
 *
 *  ```ts
 *  import { Lazy } from 'foldkit/test'
 *
 *  test('reuses lazy views for an unchanged Model', () => {
 *    Lazy.expectAllReused({ view, model: initialModel })
 *  })
 *  ```
 */
export const expectAllReused = <Model, Message>(
  config: Readonly<{
    view: (model: Model, h: HtmlBuilder<Message>) => Html | Document
    model: Model
  }>,
): void => {
  const { view, model } = config
  const registry = createHtmlBoundaryRegistry()
  const render = (): void => {
    beginHtmlRender(registry)
    setHtmlRuntime(noOpDispatch.dispatchSync, lazyContext, registry)

    try {
      view(model, htmlBuilderFor<Message>())
    } finally {
      clearHtmlRuntime()
    }
  }

  render()

  const resolutions: Array<LazyResolution> = []
  observeLazyResolutions(resolution => {
    resolutions.push(resolution)
  }, render)

  if (Array.isArrayEmpty(resolutions)) {
    throw new Error(
      'The second render made no lazy calls. Choose a Model that renders ' +
        'the memoized content you want to test.',
    )
  }

  const misses = toMisses(resolutions)

  if (Array.isReadonlyArrayNonEmpty(misses)) {
    throw new Error(formatFailure(misses))
  }
}
