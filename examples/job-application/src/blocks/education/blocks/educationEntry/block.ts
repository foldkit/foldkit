import { Effect, Layer } from 'effect'

import { layer as ListboxLayer } from '@foldkit/ui/listbox'

import { GraduationYearListboxBinding } from './composition'
import { EducationEntryDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
import { update } from './update'
import { view } from './view'

export const EducationEntryBlock = EducationEntryDefinition.contract
export const layer = EducationEntryDefinition.makeBlock(
  Effect.gen(function* () {
    const graduationYearListbox = yield* GraduationYearListboxBinding

    return { children: [graduationYearListbox], init, update, receive, view }
  }),
).provide(Layer.mergeAll(ListboxLayer)).layer
