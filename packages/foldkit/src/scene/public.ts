export * from '../test/scene.js'
export { scene } from './scene.js'
export {
  type InMessageStep,
  inMessage,
} from '../experimental/layered/testing/inMessage.js'
export {
  type TestBlock,
  type TestEffect,
  withBlock,
} from '../experimental/layered/testing/withBlock.js'

/** @internal Names a selected Block/Layer subject in inferred Scene declarations. */
export type { SelectedLayeredRoot } from '../runtime/rootBlock.js'
