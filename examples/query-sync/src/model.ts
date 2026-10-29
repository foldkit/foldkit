import { Schema } from 'effect'

import { Listbox } from '@foldkit/ui'

import { ApplicationRoute, Diet, Period } from './route'

export const dietFilterItems: ReadonlyArray<string> = ['', ...Diet.literals]
export const periodFilterItems: ReadonlyArray<string> = ['', ...Period.literals]
export const DietListboxBlock = Listbox.makeBlock()
export const PeriodListboxBlock = Listbox.makeBlock()

export const Model = Schema.Struct({
  route: ApplicationRoute,
  dietListbox: DietListboxBlock.Model,
  periodListbox: PeriodListboxBlock.Model,
})
export type Model = typeof Model.Type
