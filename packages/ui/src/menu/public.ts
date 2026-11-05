export {
  InMessage,
  makeBlock,
  layer,
  buttonId,
  ActivationTrigger,
  groupContiguous,
  resolveTypeaheadMatch,
  type InitConfig,
  type ViewInputs,
  type ItemConfig,
  type GroupHeading,
  type Completed,
} from './index.js'

export type { AnchorConfig } from '../anchor/index.js'

/** Original Menu Command and Mount Definitions for Story and Scene test resolution. */
export * as test from './test.js'

export type { MenuKey } from './menu.js'

/** @internal Nameable fixed-family evidence in emitted consumer declarations. */
export type {
  MenuRefinementKey,
  SharedMenuProof,
  SharedMenuFacts,
} from './menu.js'
export type { OutMessage, OutMessageSchema } from './menu.js'

/** @internal Preserves exact fixed-family reader names in emitted declarations. */
export type { MenuReader } from './menu.js'

/** @internal Keeps inferred provider exports nameable through this entry point. */
export type { AnimationKey } from '../animation/index.js'
