import type { ViewBuilderFor as ContractViewBuilderFor } from '../experimental/constructed/authoring.js'
import type { ViewBuilderFor as NativeViewBuilderFor } from './definition.js'

/**
 * Derives an extracted view helper's Html builder from either a native or an
 * independently constructed Composition, retaining its registered capabilities.
 */
export type ViewBuilderFor<CompositionValue> =
  CompositionValue extends Readonly<{ Message: unknown }>
    ? NativeViewBuilderFor<CompositionValue>
    : ContractViewBuilderFor<CompositionValue>
