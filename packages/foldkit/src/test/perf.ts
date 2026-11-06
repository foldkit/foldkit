import { Predicate } from 'effect'

import type { Document, Html, HtmlBuilder } from '../html/index.js'
import { type LazyMissReason, observeLazyResolutions } from '../html/lazy.js'
import { messageTagPath } from '../runtime/instrument.js'
import type { VNode } from '../vdom.js'
import type { SimulationUpdateReturn } from './internal.js'
import {
  type SceneSimulation,
  type SceneStep,
  __runSteps as runSteps,
  __toInternal as toInternal,
} from './scene.js'

// TYPES

/** One lazy cache miss seen while rendering a measured step. `slotId` numbers
 *  lazy instances in the order the measured block first saw them. */
export type LazyMissDetail = Readonly<{
  slotId: number
  /** The label the slot was created with, if any. */
  label: string | undefined
  key: PropertyKey | undefined
  reason: LazyMissReason['_tag']
  changedArguments: ReadonlyArray<number>
}>

/** Estimated DOM work between the previous render and this one. It walks the
 *  two VNode trees the way snabbdom patches them: same `sel` and `key` patch in
 *  place, anything else is replaced, and a reused VNode reference (a lazy hit)
 *  skips its subtree. */
export type DiffEstimate = Readonly<{
  created: number
  removed: number
  updated: number
  moved: number
  /** Attribute, prop, class, style, dataset and text values that changed. */
  writes: number
  reusedSubtrees: number
  reusedNodes: number
}>

/** Work done by one measured step that ran update at least once. */
export type StepProfile = Readonly<{
  /** 1-based position of the step inside the measured block. */
  step: number
  /** Message tags passed to update, nested Submodel tags joined with `>`. */
  messages: ReadonlyArray<string>
  updateMs: number
  viewRenders: number
  viewMs: number
  vnodes: number
  /** VNodes the view constructed this render: `vnodes` minus the nodes reused
   *  by reference from the previous render (lazy hits). The machine-independent
   *  measure of view cost. */
  vnodesBuilt: number
  lazyHits: number
  lazyMisses: ReadonlyArray<LazyMissDetail>
  diff: DiffEstimate
}>

/** Totals over every step in a measured block that ran update. Steps that only
 *  observe (assertions) re-render in a Scene but not in the runtime, so they
 *  are left out. */
export type ProfileTotals = Readonly<{
  updates: number
  updateMs: number
  viewRenders: number
  viewMs: number
  maxVNodes: number
  vnodesBuilt: number
  lazyHits: number
  lazyMisses: number
  /** Lazy misses for slots or keys that had a cached entry, so a cache was
   *  invalidated. Excludes `NoCachedEntry`, which is expected when a row or
   *  view appears for the first time. */
  lazyInvalidations: number
  nodesCreated: number
  nodesRemoved: number
  nodesUpdated: number
  nodesMoved: number
  nodesChanged: number
  writes: number
}>

export type Profile = Readonly<{
  steps: ReadonlyArray<StepProfile>
  total: ProfileTotals
}>

/** Upper bounds checked by {@link budget}. Every field is optional. Counts are
 *  deterministic and safe for CI. `updateMs` and `viewMs` depend on the
 *  machine, so keep them generous or leave them out. */
export type Budget = Partial<ProfileTotals>

// DIFF ESTIMATE

type MutableDiff = {
  -readonly [K in keyof DiffEstimate]: DiffEstimate[K]
}

const emptyDiff = (): MutableDiff => ({
  created: 0,
  removed: 0,
  updated: 0,
  moved: 0,
  writes: 0,
  reusedSubtrees: 0,
  reusedNodes: 0,
})

type Child = VNode | string

const sizeCache = new WeakMap<VNode, number>()

const sizeOf = (node: Child | undefined): number => {
  if (node === undefined) {
    return 0
  }
  if (Predicate.isString(node)) {
    return 1
  }
  const cached = sizeCache.get(node)
  if (cached !== undefined) {
    return cached
  }
  let size = 1
  for (const child of node.children ?? []) {
    size += sizeOf(child)
  }
  sizeCache.set(node, size)
  return size
}

const DATA_MODULES = ['attrs', 'props', 'class', 'style', 'dataset'] as const

const changedKeyCount = (
  previous: Readonly<Record<string, unknown>> | undefined,
  next: Readonly<Record<string, unknown>> | undefined,
): number => {
  if (previous === next) {
    return 0
  }
  const before = previous ?? {}
  const after = next ?? {}
  let changed = 0
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      changed++
    }
  }
  for (const key of Object.keys(before)) {
    if (!(key in after)) {
      changed++
    }
  }
  return changed
}

const dataWrites = (previous: VNode, next: VNode): number => {
  if (previous.data === next.data) {
    return 0
  }
  let writes = 0
  for (const module of DATA_MODULES) {
    writes += changedKeyCount(previous.data?.[module], next.data?.[module])
  }
  return writes
}

const isSameNode = (previous: Child, next: Child): boolean => {
  if (Predicate.isString(previous) || Predicate.isString(next)) {
    return Predicate.isString(previous) && Predicate.isString(next)
  }
  return previous.sel === next.sel && previous.key === next.key
}

const keyOf = (child: Child): PropertyKey | undefined =>
  Predicate.isString(child) ? undefined : child.key

const diffNode = (previous: Child, next: Child, diff: MutableDiff): void => {
  if (previous === next) {
    if (!Predicate.isString(next)) {
      diff.reusedSubtrees++
      diff.reusedNodes += sizeOf(next)
    }
    return
  }
  if (!isSameNode(previous, next)) {
    diff.removed += sizeOf(previous)
    diff.created += sizeOf(next)
    return
  }
  if (Predicate.isString(previous) || Predicate.isString(next)) {
    diff.updated++
    diff.writes++
    return
  }
  const writes =
    dataWrites(previous, next) + (previous.text === next.text ? 0 : 1)
  if (writes > 0) {
    diff.updated++
    diff.writes += writes
  }
  diffChildren(previous.children ?? [], next.children ?? [], diff)
}

const diffChildren = (
  previous: ReadonlyArray<Child>,
  next: ReadonlyArray<Child>,
  diff: MutableDiff,
): void => {
  const keyedIndex = new Map<PropertyKey, number>()
  previous.forEach((child, index) => {
    const key = keyOf(child)
    if (key !== undefined) {
      keyedIndex.set(key, index)
    }
  })

  const matched = new Set<number>()
  let furthestMatch = -1

  next.forEach((child, index) => {
    const key = keyOf(child)
    const candidate = key === undefined ? index : keyedIndex.get(key)
    const previousChild =
      candidate === undefined ? undefined : previous[candidate]

    if (
      candidate !== undefined &&
      previousChild !== undefined &&
      !matched.has(candidate) &&
      keyOf(previousChild) === key &&
      isSameNode(previousChild, child)
    ) {
      matched.add(candidate)
      if (key !== undefined && candidate < furthestMatch) {
        diff.moved++
      }
      furthestMatch = Math.max(furthestMatch, candidate)
      diffNode(previousChild, child, diff)
    } else {
      diff.created += sizeOf(child)
    }
  })

  previous.forEach((child, index) => {
    if (!matched.has(index)) {
      diff.removed += sizeOf(child)
    }
  })
}

/** Estimates the DOM work snabbdom does to patch `previous` into `next`. */
export const estimateDiff = (
  previous: VNode | undefined,
  next: VNode,
): DiffEstimate => {
  const diff = emptyDiff()
  if (previous === undefined) {
    diff.created = sizeOf(next)
  } else {
    diffNode(previous, next, diff)
  }
  return diff
}

/** Counts the element and text nodes in a VNode tree. */
export const countVNodes = (node: VNode): number => sizeOf(node)

// MEASURE

type StepCounters = {
  messages: Array<string>
  updateMs: number
  viewRenders: number
  viewMs: number
  lazyHits: number
  lazyMisses: Array<LazyMissDetail>
}

const freshCounters = (): StepCounters => ({
  messages: [],
  updateMs: 0,
  viewRenders: 0,
  viewMs: 0,
  lazyHits: 0,
  lazyMisses: [],
})

const totalsOf = (steps: ReadonlyArray<StepProfile>): ProfileTotals => {
  let total: ProfileTotals = {
    updates: 0,
    updateMs: 0,
    viewRenders: 0,
    viewMs: 0,
    maxVNodes: 0,
    vnodesBuilt: 0,
    lazyHits: 0,
    lazyMisses: 0,
    lazyInvalidations: 0,
    nodesCreated: 0,
    nodesRemoved: 0,
    nodesUpdated: 0,
    nodesMoved: 0,
    nodesChanged: 0,
    writes: 0,
  }
  for (const step of steps) {
    const changed = step.diff.created + step.diff.removed + step.diff.updated
    total = {
      updates: total.updates + step.messages.length,
      updateMs: total.updateMs + step.updateMs,
      viewRenders: total.viewRenders + step.viewRenders,
      viewMs: total.viewMs + step.viewMs,
      maxVNodes: Math.max(total.maxVNodes, step.vnodes),
      vnodesBuilt: total.vnodesBuilt + step.vnodesBuilt,
      lazyHits: total.lazyHits + step.lazyHits,
      lazyMisses: total.lazyMisses + step.lazyMisses.length,
      lazyInvalidations:
        total.lazyInvalidations +
        step.lazyMisses.filter(({ reason }) => reason !== 'NoCachedEntry')
          .length,
      nodesCreated: total.nodesCreated + step.diff.created,
      nodesRemoved: total.nodesRemoved + step.diff.removed,
      nodesUpdated: total.nodesUpdated + step.diff.updated,
      nodesMoved: total.nodesMoved + step.diff.moved,
      nodesChanged: total.nodesChanged + changed,
      writes: total.writes + step.diff.writes,
    }
  }
  return total
}

/** Runs `steps` and reports the work each one did: update calls and time,
 *  view renders and time, VNode count, lazy cache hits and misses, and an
 *  estimate of the DOM patch. Steps that never call update are left out of
 *  the report. Works like `inside`: the steps run in order against the same
 *  simulation and every normal Scene check still applies.
 *
 *  ```ts
 *  let profile: Perf.Profile | undefined
 *  scene(
 *    { update, view },
 *    given(model),
 *    Perf.measure(result => { profile = result }, click(role('button'))),
 *  )
 *  ```
 */
export const measure =
  <Model, Message, OutMessage = undefined>(
    onProfile: (profile: Profile) => void,
    ...steps: ReadonlyArray<NoInfer<SceneStep<Model, Message, OutMessage>>>
  ) =>
  (
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const originalUpdate = internal.updateFn
    const originalView = internal.viewFn
    const slotIds = new Map<object, number>()
    let counters = freshCounters()

    const updateFn = (
      model: Model,
      message: Message,
    ): SimulationUpdateReturn<Model, OutMessage> => {
      counters.messages.push(messageTagPath(message))
      const start = performance.now()
      const result = originalUpdate(model, message)
      counters.updateMs += performance.now() - start
      return result
    }

    const viewFn = (model: Model, h: HtmlBuilder<Message>): Html | Document => {
      counters.viewRenders++
      const start = performance.now()
      const result = observeLazyResolutions(
        ({ slot, label, key, missReason }) => {
          const slotId = slotIds.get(slot) ?? slotIds.size + 1
          slotIds.set(slot, slotId)
          if (missReason === undefined) {
            counters.lazyHits++
          } else {
            counters.lazyMisses.push({
              slotId,
              label,
              key,
              reason: missReason._tag,
              changedArguments:
                missReason._tag === 'ArgumentsChanged'
                  ? missReason.indices
                  : [],
            })
          }
        },
        () => originalView(model, h),
      )
      counters.viewMs += performance.now() - start
      return result
    }

    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    let current = {
      ...internal,
      updateFn,
      viewFn,
    } as unknown as SceneSimulation<Model, Message, OutMessage>
    const profiles: Array<StepProfile> = []

    steps.forEach((step, index) => {
      counters = freshCounters()
      const before: VNode | undefined = toInternal(current).html
      current = runSteps(current, [step])
      const after = toInternal(current).html

      if (counters.messages.length > 0 && after !== undefined) {
        const diff = estimateDiff(before, after)
        const vnodes = sizeOf(after)
        profiles.push({
          step: index + 1,
          messages: counters.messages,
          updateMs: counters.updateMs,
          viewRenders: counters.viewRenders,
          viewMs: counters.viewMs,
          vnodes,
          vnodesBuilt: vnodes - diff.reusedNodes,
          lazyHits: counters.lazyHits,
          lazyMisses: counters.lazyMisses,
          diff,
        })
      }
    })

    onProfile({ steps: profiles, total: totalsOf(profiles) })

    return {
      ...toInternal(current),
      updateFn: originalUpdate,
      viewFn: originalView,
    } as unknown as SceneSimulation<Model, Message, OutMessage>
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  }

// FORMAT

const formatMs = (ms: number): string => `${ms.toFixed(2)}ms`

const MAX_LISTED_KEYS = 5

const missLabel = (miss: LazyMissDetail): string =>
  miss.reason === 'ArgumentsChanged'
    ? `ArgumentsChanged [${miss.changedArguments.join(', ')}]`
    : miss.reason

const formatKeys = (keys: ReadonlyArray<PropertyKey | undefined>): string => {
  const defined = keys.filter(key => key !== undefined).map(String)
  if (defined.length === 0) {
    return ''
  }
  const listed = defined.slice(0, MAX_LISTED_KEYS).join(', ')
  const more =
    defined.length > MAX_LISTED_KEYS
      ? `, +${defined.length - MAX_LISTED_KEYS} more`
      : ''
  return ` (key ${listed}${more})`
}

// NOTE: misses with the same slot and reason are grouped so a window of new
// rows reads as one line instead of one line per key.
const formatMisses = (
  misses: ReadonlyArray<LazyMissDetail>,
): ReadonlyArray<string> => {
  const groups = new Map<string, Array<LazyMissDetail>>()
  for (const miss of misses) {
    const slot =
      miss.label === undefined
        ? `#${miss.slotId}`
        : `#${miss.slotId} "${miss.label}"`
    const label = `lazy ${slot}: ${missLabel(miss)}`
    groups.set(label, [...(groups.get(label) ?? []), miss])
  }
  return [...groups].map(([label, group]) => {
    const count = group.length > 1 ? ` x${group.length}` : ''
    return `${label}${count}${formatKeys(group.map(({ key }) => key))}`
  })
}

/** Renders a profile as readable text, one block per step. */
export const format = (profile: Profile): string => {
  const lines = profile.steps.flatMap(step => [
    `step ${step.step}: ${step.messages.join(', ')}`,
    `  update ${formatMs(step.updateMs)} | view x${step.viewRenders} ${formatMs(step.viewMs)} | ${step.vnodesBuilt} of ${step.vnodes} vnodes built`,
    `  lazy ${step.lazyHits} hit / ${step.lazyMisses.length} miss | dom +${step.diff.created} -${step.diff.removed} ~${step.diff.updated} moved ${step.diff.moved} writes ${step.diff.writes} | reused ${step.diff.reusedNodes} nodes in ${step.diff.reusedSubtrees} subtrees`,
    ...formatMisses(step.lazyMisses).map(line => `    ${line}`),
  ])
  const { total } = profile
  return [
    ...lines,
    `total: ${total.updates} updates, ${total.viewRenders} renders, ${total.vnodesBuilt} vnodes built, ${total.lazyMisses} lazy misses (${total.lazyInvalidations} invalidated), ${total.nodesChanged} nodes changed (+${total.nodesCreated} -${total.nodesRemoved} ~${total.nodesUpdated}), max ${total.maxVNodes} vnodes`,
  ].join('\n')
}

// BUDGET

const BUDGET_KEYS: ReadonlyArray<keyof ProfileTotals> = [
  'updates',
  'updateMs',
  'viewRenders',
  'viewMs',
  'maxVNodes',
  'vnodesBuilt',
  'lazyHits',
  'lazyMisses',
  'lazyInvalidations',
  'nodesCreated',
  'nodesRemoved',
  'nodesUpdated',
  'nodesMoved',
  'nodesChanged',
  'writes',
]

/** Returns one line per budget field the profile goes over. */
export const checkBudget = (
  limits: Budget,
  profile: Profile,
): ReadonlyArray<string> =>
  BUDGET_KEYS.flatMap(key => {
    const limit = limits[key]
    const actual = profile.total[key]
    return limit !== undefined && actual > limit
      ? [
          `${key}: ${Number.isInteger(actual) ? actual : actual.toFixed(2)} > ${limit}`,
        ]
      : []
  })

/** Runs `steps` like {@link measure} and throws when the totals go over any
 *  limit in `limits`. The error lists the exceeded limits and the full
 *  profile, including which lazy slots missed and why.
 *
 *  ```ts
 *  scene(
 *    { update, view },
 *    given(model),
 *    Perf.budget({ lazyMisses: 1, nodesChanged: 20 }, click(role('row'))),
 *  )
 *  ```
 */
export const budget = <Model, Message, OutMessage = undefined>(
  limits: Budget,
  ...steps: ReadonlyArray<NoInfer<SceneStep<Model, Message, OutMessage>>>
) =>
  measure<Model, Message, OutMessage>(
    profile => {
      const exceeded = checkBudget(limits, profile)
      if (exceeded.length > 0) {
        throw new Error(
          [
            'Perf budget exceeded:',
            ...exceeded.map(line => `  ${line}`),
            '',
            format(profile),
          ].join('\n'),
        )
      }
    },
    ...steps,
  )
