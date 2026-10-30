import { Combobox } from '@foldkit/ui'

import { City } from './domain/domain'

export const CityCombobox = Combobox.makeBlock(City)
export const CityMultiCombobox = Combobox.Multi.makeBlock(City)
