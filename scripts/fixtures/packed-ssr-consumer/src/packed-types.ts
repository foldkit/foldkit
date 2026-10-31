import type {
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
  ServerConfig,
  ServerRenderOptions,
  StaticRenderOptions,
} from 'foldkit/experimental/server'
import type { HydrateOptions } from 'foldkit/runtime'

const hydratable: HydratableRenderOptions = { buildId: 'deployment-1' }
const staticOnly: StaticRenderOptions = { isHydratable: false }
const either: ReadonlyArray<RenderOptions> = [hydratable, staticOnly]
const hydrate: HydrateOptions = { buildId: 'deployment-1' }

export type Used = [
  EntryResult,
  InjectIntoTemplateOptions,
  RenderFlagsOptions<never>,
  RenderUrlFlagsOptions<never>,
  RenderUrlOptions,
  RenderedApplication,
  RequestClassification,
  ResponseOptions,
  ServerConfig<never, never, never>,
  ServerRenderOptions<never>,
]

export const count = either.length + Number(hydrate.buildId === '')
