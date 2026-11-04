export {
  makeBlock,
  layer,
  Orientation,
  ActivationMode,
  type InitConfig,
  type ViewInputs,
  type RenderInfo,
  type TabInfo,
  type Completed,
} from './index.js'

/** Original Tabs Command Definitions for Story and Scene test resolution. */
export * as test from './test.js'

export type { TabsKey } from './index.js'

/** @internal Nameable fixed-family evidence in emitted consumer declarations. */
export type {
  TabsRefinementKey,
  SharedTabsProof,
  SharedTabsFacts,
} from './block.js'
export type { OutMessageSchema } from './types.js'

/** @internal Preserves exact fixed-family reader names in emitted declarations. */
export type { TabsReader } from './contract.js'
