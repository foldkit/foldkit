import type { Layer } from 'effect'

/** @internal Extracts services supplied by every possible Layer recipe. */
export type LayerOutputs<LayerRecipe> = [LayerRecipe] extends [Layer.Any]
  ? Extract<
      Layer.Success<LayerRecipe>,
      [LayerRecipe] extends [Layer.Layer<infer Outputs, any, any>]
        ? Outputs
        : never
    >
  : never
