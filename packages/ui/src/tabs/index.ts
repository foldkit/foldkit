export { makeBlock, type Completed } from './contract.js'
export { layer } from './block.js'
export { Orientation, ActivationMode } from './types.js'
export type { InitConfig, ViewInputs, RenderInfo, TabInfo } from './types.js'

export type { TabsKey } from './definition.js'

/** @internal Nameable fixed-family evidence in emitted consumer declarations. */
export type {
  TabsRefinementKey,
  SharedTabsProof,
  SharedTabsFacts,
} from './block.js'
export type { OutMessageSchema } from './types.js'

/** @internal Preserves exact fixed-family reader names in emitted declarations. */
export type { TabsReader } from './contract.js'
