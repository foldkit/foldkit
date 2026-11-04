export { makeBlock, layer } from './single.js'
export {
  buttonId,
  InMessage,
  Orientation,
  ActivationTrigger,
  resolveTypeaheadMatch,
} from './shared.js'
export type { Completed, InitConfig, ViewInputs } from './single.js'
export type {
  ItemConfig,
  GroupHeading,
  BaseViewInputsCommon,
  ItemToValueInput,
  OutMessageSchema,
} from './shared.js'
export type { AnchorConfig } from '../anchor/index.js'
export * as Multi from './multiPublic.js'

/** Original Listbox Command and Mount Definitions for Story and Scene test resolution. */
export * as test from './test.js'

export type { ListboxKey } from './single.js'

export type {
  ListboxKey as MultiListboxKey,
  Completed as MultiCompleted,
  ViewInputs as MultiViewInputs,
} from './multi.js'

export type {
  ListboxRefinementKey,
  SharedListboxProof,
  SharedListboxFacts,
} from './single.js'

/** @internal Names the Multi selection witness at the package boundary. */
export type {
  ListboxRefinementKey as MultiListboxRefinementKey,
  SharedListboxProof as MultiSharedListboxProof,
  SharedListboxFacts as MultiSharedListboxFacts,
} from './multi.js'

/** @internal Preserves exact fixed-family reader names in emitted declarations. */
export type { ListboxReader } from './single.js'
export type { ListboxReader as MultiListboxReader } from './multi.js'
