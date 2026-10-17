import { Array, Context, Effect, Match, Predicate, pipe } from 'effect'

import {
  __beginRender as beginHtmlRender,
  __clearRuntime as clearHtmlRuntime,
  __createBoundaryRegistry as createHtmlBoundaryRegistry,
  __htmlBuilder as htmlBuilderFor,
  __setRuntime as setHtmlRuntime,
} from '../html/index.js'
import type { Document, Html, HtmlBuilder } from '../html/index.js'
import {
  type LazyMissReason,
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
    'Create the slot at module scope and key keyed slots by a stable Model id.',
  FunctionChanged:
    'Pass a module-level view function, not one created during the view.',
  FrameChanged: 'Give each Submodel boundary its own slot or key.',
  ArgumentCountChanged: 'Pass the same number of arguments on every render.',
  ArgumentsChanged:
    'Pass Model values, not objects, arrays, or closures created during the view.',
}

const formatKey = (key: PropertyKey): string =>
  Predicate.isString(key) ? JSON.stringify(key) : String(key)

const formatReason = (reason: LazyMissReason): string =>
  Match.value(reason).pipe(
    Match.tagsExhaustive({
      NoCachedEntry: () => 'NoCachedEntry',
      FunctionChanged: () => 'FunctionChanged',
      FrameChanged: () => 'FrameChanged',
      ArgumentCountChanged: ({ previousCount, currentCount }) =>
        `ArgumentCountChanged from ${previousCount} to ${currentCount}`,
      ArgumentsChanged: ({ indices }) =>
        `ArgumentsChanged at index ${indices.join(', ')}`,
    }),
  )

const formatMiss = ({ slotId, key, reason }: LazyMiss): string =>
  key === undefined
    ? `  slot ${slotId}: ${formatReason(reason)}`
    : `  slot ${slotId}, key ${formatKey(key)}: ${formatReason(reason)}`

const formatFailure = (misses: ReadonlyArray<LazyMiss>): string => {
  const slotCount =
    misses.length === 1 ? '1 lazy slot' : `${misses.length} lazy slots`
  const hints = pipe(
    misses,
    Array.map(({ reason }) => reason._tag),
    Array.dedupe,
    Array.map(tag => `  ${tag}: ${REASON_HINTS[tag]}`),
  )

  return [
    'Expected every lazy slot to reuse its cached view when the same Model ' +
      `renders twice, but ${slotCount} rebuilt:`,
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

/** Renders `view` twice with the same `model` and throws if any `createLazy`
 *  or `createKeyedLazy` slot rebuilds its view on the second render. The
 *  error lists each slot that rebuilt, its key, and why it missed its cache.
 *  Also throws when the view renders no lazy slots, so a Model that never
 *  reaches the memoized views cannot pass.
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
      'Expected the view to render at least one lazy slot, but it rendered ' +
        'none. Check that this Model reaches the createLazy or ' +
        'createKeyedLazy calls under test.',
    )
  }

  const misses = toMisses(resolutions)

  if (Array.isReadonlyArrayNonEmpty(misses)) {
    throw new Error(formatFailure(misses))
  }
}
