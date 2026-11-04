/** @internal Library-family declaration and resolution for Foldkit packages. */
export {
  makeFamilyDeclaration,
  resolveFamily,
} from '../../experimental/contracted/familyLayer.js'
/** @internal Exact family metadata required by library declaration consumers. */
export type {
  FamilyLayerDefinition,
  FamilyLayerProof,
  FamilySpecializationLayer,
  UnifiedFamilyBlock,
} from '../../experimental/contracted/familyLayer.js'

/** @internal Authenticated acquisition for library-owned family providers. */
export { readDeclaredExecutable } from '../../experimental/constructed/symbolic.js'
/** @internal Captured-provider authentication for closed library families. */
export { registerFixedProviderGuard } from '../../experimental/contracted/runtime.js'
