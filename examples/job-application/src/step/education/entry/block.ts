import { Effect, Layer } from 'effect'

import { Listbox } from '@foldkit/ui'

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
).provide(Layer.mergeAll(Listbox.layer)).layer
