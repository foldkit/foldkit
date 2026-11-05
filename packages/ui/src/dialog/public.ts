export {
  InMessage,
  DialogBlock,
  layer,
  titleId,
  descriptionId,
  initialFocusMarkerAttribute,
  initialFocusMarkerSelector,
  type InitConfig,
  type ViewInputs,
  type RenderInfo,
} from './index.js'

/** Original Dialog Command Definitions for Story and Scene test resolution. */
export * as test from './test.js'

export type { DialogKey } from './block.js'

/** @internal Keeps inferred provider exports nameable through this entry point. */
export type { AnimationKey } from '../animation/index.js'
