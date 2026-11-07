import { Schema } from 'effect'

import { Listbox } from '@foldkit/ui'

import { ApplicationRoute, Diet, Period } from './route'

export const DietFilter = Schema.Literals(['All', ...Diet.literals])
export type DietFilter = typeof DietFilter.Type
export const dietFilterItems = DietFilter.literals
export const DietListboxBlock = Listbox.makeBlock(DietFilter)

export const PeriodFilter = Schema.Literals(['All', ...Period.literals])
export type PeriodFilter = typeof PeriodFilter.Type
export const periodFilterItems = PeriodFilter.literals
export const PeriodListboxBlock = Listbox.makeBlock(PeriodFilter)

export const Model = Schema.Struct({
  route: ApplicationRoute,
  dietListbox: DietListboxBlock.Model,
  periodListbox: PeriodListboxBlock.Model,
})
export type Model = typeof Model.Type
