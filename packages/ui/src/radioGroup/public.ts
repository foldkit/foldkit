export {
  makeBlock,
  layer,
  Orientation,
  type InitConfig,
  type ViewInputs,
  type RenderInfo,
  type OptionInfo,
  type Completed,
} from './index.js'

/** Original RadioGroup Command Definitions for Story and Scene test resolution. */
export * as test from './test.js'

export type { RadioGroupKey } from './index.js'

/** @internal Nameable fixed-family evidence in emitted consumer declarations. */
export type {
  RadioGroupRefinementKey,
  SharedRadioGroupProof,
  SharedRadioGroupFacts,
} from './radioGroup.js'
export type { OutMessage, OutMessageSchema } from './radioGroup.js'

/** @internal Preserves exact fixed-family reader names in emitted declarations. */
export type { RadioGroupReader } from './radioGroup.js'
