import {
  Multi as MultiCombobox,
  makeBlock as makeComboboxBlock,
} from '@foldkit/ui/combobox'

import { City } from './domain'

export const CityComboboxBlock = makeComboboxBlock(City)
export const CityMultiComboboxBlock = MultiCombobox.makeBlock(City)
