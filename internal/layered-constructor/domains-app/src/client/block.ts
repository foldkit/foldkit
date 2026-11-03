import { Effect } from 'effect'

import { EffectsLayer } from './command'
import {
  AvailabilityListboxBinding,
  CartDialogBinding,
  DomainsQueryBinding,
  FiltersDialogBinding,
  ResultsListBinding,
  SortListboxBinding,
  TldDialogBinding,
  TldListboxBinding,
} from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const resultsList = yield* ResultsListBinding
    const cartDialog = yield* CartDialogBinding
    const filtersDialog = yield* FiltersDialogBinding
    const tldDialog = yield* TldDialogBinding
    const domainsQuery = yield* DomainsQueryBinding
    const tldListbox = yield* TldListboxBinding
    const availabilityListbox = yield* AvailabilityListboxBinding
    const sortListbox = yield* SortListboxBinding

    return {
      children: [
        resultsList,
        cartDialog,
        filtersDialog,
        tldDialog,
        domainsQuery,
        tldListbox,
        availabilityListbox,
        sortListbox,
      ],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
)
