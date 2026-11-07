import { Layer } from 'effect'

import { DatePicker, Listbox } from '@foldkit/ui'

import { PersonalInfoBlock } from './block'
import { ValidateEmailAsync } from './command'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = PersonalInfoBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: ValidateEmailAsync.layer,
}).pipe(Layer.provide(Layer.mergeAll(Listbox.layer, DatePicker.layer)))
