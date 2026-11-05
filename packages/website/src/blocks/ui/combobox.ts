import { Combobox } from '@foldkit/ui'

import { City } from './domain/domain'

export const CityComboboxBlock = Combobox.makeBlock(City)
export const CityMultiComboboxBlock = Combobox.Multi.makeBlock(City)
