import type {
  ApplicationConfig,
  ApplicationConfigWithFlags,
  EntryResult,
  HydratableRenderOptions,
  InjectIntoTemplateOptions,
  RenderFlagsOptions,
  RenderOptions,
  RenderUrlFlagsOptions,
  RenderUrlOptions,
  RenderedApplication,
  RequestClassification,
  ResponseOptions,
  StaticRenderOptions,
} from 'foldkit/experimental/server'
import type * as LibraryBlock from 'foldkit/internal/block'
import type { HydrateOptions } from 'foldkit/runtime'

const hydratable: HydratableRenderOptions = { buildId: 'deployment-1' }
const staticOnly: StaticRenderOptions = { isHydratable: false }
const either: ReadonlyArray<RenderOptions> = [hydratable, staticOnly]
const hydrate: HydrateOptions = { buildId: 'deployment-1' }

export type Used = [
  ApplicationConfig<never>,
  ApplicationConfigWithFlags<never, never>,
  EntryResult,
  InjectIntoTemplateOptions,
  RenderFlagsOptions<never>,
  RenderUrlFlagsOptions<never>,
  RenderUrlOptions,
  RenderedApplication,
  RequestClassification,
  ResponseOptions,
]

export const count = either.length + Number(hydrate.buildId === '')

export type LibraryFamilyEntries = readonly [
  typeof LibraryBlock.makeFamilyDeclaration,
  typeof LibraryBlock.resolveFamily,
]
