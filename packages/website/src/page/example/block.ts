import { ExampleDetailComposition } from './composition'
import {
  EffectsLayer,
  informRouteChanged,
  init,
  loadInitialSources,
  update,
  view,
} from './example'

export { mounts } from './composition'
export {
  CurrentSourcesAsyncData,
  EffectsLayer,
  informRouteChanged,
  init,
  LoadExampleSources,
  loadInitialSources,
  Message,
  Model,
  tableOfContents,
  update,
  view,
} from './example'

export const block = ExampleDetailComposition.makeBlock({
  init,
  update,
  view,
  expose: { loadInitialSources, informRouteChanged },
  EffectsLayer,
})
