// NOTE: TypeDoc-only entry point. The website documents the stable and
// experimental Foldkit exports in one project so their type references share an
// identifier space. The namespace keeps the stability boundary visible in the
// sidebar and page titles. This file is excluded from the package build.

export * from './src/index.js'
export * as Experimental from './typedoc-experimental.js'

/** Schema-derived map Bindings, imported from `foldkit/mapBinding`. */
export * as MapBinding from './src/block/mapBinding.js'

/** Whole tagged-variant Bindings, imported from `foldkit/variantBinding`. */
export * as VariantBinding from './src/block/variantBinding.js'
