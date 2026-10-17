import { Schema } from 'effect'

import { Listbox } from '@foldkit/ui'

import { ApplicationRoute, Diet, Period } from './route'

export const dietFilterItems: ReadonlyArray<string> = ['', ...Diet.literals]
export const periodFilterItems: ReadonlyArray<string> = ['', ...Period.literals]
export const DietListbox = Listbox.create()
export const PeriodListbox = Listbox.create()

export const Model = Schema.Struct({
  route: ApplicationRoute,
  dietListbox: DietListbox.Model,
  periodListbox: PeriodListbox.Model,
})
export type Model = typeof Model.Type
