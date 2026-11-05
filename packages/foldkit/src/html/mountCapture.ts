import type { ActiveInstance } from '../block/instanceContext.js'
import type { FoldkitMountMarker } from './index.js'
import type { MountDispatchResolver } from './runtimeSingleton.js'

/** @internal The acquiring occurrence and its render-owned delivery resolver. */
export type MountCapture = Readonly<{
  owner: ActiveInstance | undefined
  resolver: MountDispatchResolver
}>

const captures = new WeakMap<FoldkitMountMarker, MountCapture>()

/** @internal Associates acquisition metadata with the original VNode marker. */
export const captureMount = (
  marker: FoldkitMountMarker,
  capture: MountCapture,
): void => {
  captures.set(marker, capture)
}

/** @internal Reads acquisition metadata without changing the public marker. */
export const mountCaptureOf = (
  marker: FoldkitMountMarker,
): MountCapture | undefined => captures.get(marker)
