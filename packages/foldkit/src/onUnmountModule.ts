import {
  type Module,
  type VNode,
  type VNodeData,
  VNodeDataMask,
  vnodeDataMaskKey,
} from './snabbdom/index.js'

const onUnmountDataKey = 'foldkitOnUnmount'

type OnUnmountData = Readonly<{
  dispatches: ReadonlyArray<() => void>
  owner: 'Live' | 'Replay'
}>

let isReplayRenderActive = false
const pendingReplayUnmounts = new Map<Node, ReadonlyArray<() => void>>()

const getOnUnmountData = (vnode: VNode): OnUnmountData | undefined =>
  vnode.data?.[onUnmountDataKey]

const setOnUnmountData = (data: VNodeData, onUnmount: OnUnmountData): void => {
  data[onUnmountDataKey] = onUnmount
  data[vnodeDataMaskKey] =
    (data[vnodeDataMaskKey] ?? 0) | VNodeDataMask.OnUnmount
}

/** Opens the replay-render window used to distinguish historical VNodes from
 *  the live imperative lifecycle they temporarily replace. */
export const beginReplayUnmountRender = (): void => {
  pendingReplayUnmounts.clear()
  isReplayRenderActive = true
}

/** Closes a successful replay-render window and discards live `OnUnmount`
 *  callbacks deferred while installing the historical view. */
export const endReplayUnmountRender = (): void => {
  isReplayRenderActive = false
  pendingReplayUnmounts.clear()
}

/** Records an `OnUnmount` callback and the render that owns it on a VNode. */
export const attachOnUnmount = (
  data: VNodeData,
  dispatch: () => void,
): void => {
  const owner = isReplayRenderActive ? 'Replay' : 'Live'
  const existing = data[onUnmountDataKey]
  setOnUnmountData(data, {
    dispatches:
      existing?.owner === owner
        ? [...existing.dispatches, dispatch]
        : [dispatch],
    owner,
  })
}

/** Dispatches the live `OnUnmount` callbacks deferred by a replay patch that
 *  failed and forced the runtime to discard the damaged DOM. Repeated destroy
 *  calls for one element are deduplicated without conflating distinct elements
 *  built from a shared VNode. */
export const flushReplayUnmountsAfterPatchFailure = (): void => {
  if (!isReplayRenderActive) {
    return
  }
  const unmountGroups = globalThis.Array.from(pendingReplayUnmounts.values())
  pendingReplayUnmounts.clear()
  for (const unmounts of unmountGroups) {
    for (const dispatchUnmount of unmounts) {
      dispatchUnmount()
    }
  }
}

/** Snabbdom module that preserves a live element's `OnUnmount` ownership while
 *  replay VNodes patch it in place, then routes teardown according to whether
 *  the historical patch succeeded or required recovery. */
export const onUnmountModule: Module = {
  dataMask: VNodeDataMask.OnUnmount,
  update: (oldVnode, vnode) => {
    const previousOnUnmount = getOnUnmountData(oldVnode)
    if (!isReplayRenderActive || previousOnUnmount?.owner !== 'Live') {
      return
    }
    const data = vnode.data === undefined ? {} : { ...vnode.data }
    vnode.data = data
    setOnUnmountData(data, previousOnUnmount)
  },
  destroy: vnode => {
    const onUnmount = getOnUnmountData(vnode)
    if (onUnmount?.owner !== 'Live') {
      return
    }
    if (isReplayRenderActive) {
      if (vnode.elm !== undefined) {
        pendingReplayUnmounts.set(vnode.elm, onUnmount.dispatches)
      }
    } else {
      for (const dispatchUnmount of onUnmount.dispatches) {
        dispatchUnmount()
      }
    }
  },
}
