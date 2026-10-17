import { Model } from './definition'
import { ProfileComposition } from './composition'
import { update } from './profile'
import { view } from './view'

export const block = ProfileComposition.makeBlock({
  init: () => ({ model: Model.make({ child: undefined }) }),
  update,
  view,
})
