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
import type { HydrateOptions } from 'foldkit/runtime'

const hydratable: HydratableRenderOptions = { buildId: 'deployment-1' }
const staticOnly: StaticRenderOptions = { isHydratable: false }
const either: ReadonlyArray<RenderOptions> = [hydratable, staticOnly]
const hydrate: HydrateOptions = { buildId: 'deployment-1' }

export type Used = [
  ApplicationConfig<never, never>,
  ApplicationConfigWithFlags<never, never, never>,
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
