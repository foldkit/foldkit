import { NotePlayerDemoComposition } from './composition'
import {
  EffectsLayer,
  init,
  managedResources,
  update,
  view,
} from './notePlayerDemo'

export const block = NotePlayerDemoComposition.makeBlock({
  init,
  update,
  view,
  managedResources,
  EffectsLayer,
})
