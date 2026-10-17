import { EffectsLayer } from './command'
import { SkillsComposition } from './composition'
import { update } from './update'
import { view } from './view'

export const block = SkillsComposition.makeBlock({
  init: SkillsComposition.makeInit((initialEntryId: string) => ({
    startup: initialEntryId,
    model: {},
  })),
  update,
  view,
  EffectsLayer,
})
