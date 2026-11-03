import {
  Multi as MultiListbox,
  makeBlock as makeListboxBlock,
} from '@foldkit/ui/listbox'

import type { ListboxItem } from './domain'

export type Character = Readonly<{
  firstName: string
  lastName: string
}>

export const ItemListboxBlock = makeListboxBlock<ListboxItem>()
export const ItemMultiListboxBlock = MultiListbox.makeBlock<ListboxItem>()
export const CharacterListboxBlock = makeListboxBlock<Character>()
