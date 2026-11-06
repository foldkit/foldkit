import { Schema } from 'effect'

import { Listbox } from '@foldkit/ui'

import { ListboxItem } from './domain'

export const Character = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
})
export type Character = typeof Character.Type

export const ItemListboxBlock = Listbox.makeBlock(ListboxItem)
export const ItemMultiListboxBlock = Listbox.Multi.makeBlock(ListboxItem)
export const CharacterListboxBlock = Listbox.makeBlock(Character, Schema.String)
