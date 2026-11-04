export { InMessage } from './shared.js'
export { makeBlock, layer } from './single.js'
export { inputId, groupContiguous, ActivationTrigger } from './shared.js'
export type { Completed, InitConfig, ViewInputs } from './single.js'
export type {
  ItemConfig,
  GroupHeading,
  BaseViewInputsCommon,
} from './shared.js'
export type { AnchorConfig } from '../anchor/index.js'
export * as Multi from './multiPublic.js'

/** Original Combobox Command and Mount Definitions for Story and Scene test resolution. */
export * as test from './test.js'

export type { ComboboxKey, ComboboxFamily } from './single.js'

export type {
  ComboboxKey as MultiComboboxKey,
  ComboboxFamily as MultiComboboxFamily,
  Completed as MultiCompleted,
  ViewInputs as MultiViewInputs,
} from './multi.js'

/** @internal Keeps schema-specialized factory declarations nameable in external consumers. */
export type { ItemSchema, MessageSchema, OutMessageSchema } from './shared.js'
