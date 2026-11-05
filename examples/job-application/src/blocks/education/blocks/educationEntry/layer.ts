import { Effect, Layer } from 'effect'

import { layer as ListboxLayer } from '@foldkit/ui/listbox'

import { EducationEntryBlock } from './block'
import { GraduationYearListboxBinding } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = EducationEntryBlock.makeLayer(
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
).pipe(Layer.provide(Layer.mergeAll(ListboxLayer)))
