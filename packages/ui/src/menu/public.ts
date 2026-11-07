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

export type {
  ValueSchema,
  MessageSchema,
  OutMessage,
  OutMessageSchema,
} from './menu.js'

/** @internal Keeps the family provider identity nameable in emitted consumers. */
export type { MenuFamily } from './menu.js'

/** @internal Keeps the private child identity nameable in emitted consumers. */
export type { AnimationKey } from '../animation/index.js'
