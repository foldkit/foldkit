import { Listbox } from '@foldkit/ui'

import type { ListboxItem } from './domain'

export type Character = Readonly<{
  firstName: string
  lastName: string
}>

export const ItemListboxBlock = Listbox.makeBlock<ListboxItem>()
export const ItemMultiListboxBlock = Listbox.Multi.makeBlock<ListboxItem>()
export const CharacterListboxBlock = Listbox.makeBlock<Character>()
