import { Combobox } from '@foldkit/ui'

import { City } from './domain/domain'

export const CityCombobox = Combobox.make(City)
export const CityMultiCombobox = Combobox.Multi.make(City)
