import { Listbox } from '@foldkit/ui'

import type { ListboxItem } from './model'

export type Character = Readonly<{
  firstName: string
  lastName: string
}>

export const ItemListbox = Listbox.create<ListboxItem>()
export const ItemMultiListbox = Listbox.Multi.create<ListboxItem>()
export const CharacterListbox = Listbox.create<Character>()
