import { Layer } from 'effect'

import { RadioGroup } from '@foldkit/ui'

import { SkillsEntryBlock } from './block'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = SkillsEntryBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
}).pipe(Layer.provide(Layer.mergeAll(RadioGroup.layer)))
