import { Effect, Layer } from 'effect'

import { layer as ListboxLayer } from '@foldkit/ui/listbox'

import { GraduationYearListboxBinding } from './composition'
import { EducationEntryDefinition } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const EducationEntryBlock = EducationEntryDefinition.contract
export const layer = EducationEntryDefinition.makeBlock(
  Effect.gen(function* () {
    const graduationYearListbox = yield* GraduationYearListboxBinding

    return {
      children: [graduationYearListbox],
      init,
      update,
      inMessageUpdate,
      view,
    }
  }),
).provide(Layer.mergeAll(ListboxLayer)).layer
