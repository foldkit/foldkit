import { Listbox } from '@foldkit/ui'

export const SortListbox = Listbox.makeBlock<string>()

export const SortListboxLive = SortListbox.Live

export const createLocalSelection = (Listbox: { makeBlock: () => unknown }) =>
  Listbox.makeBlock()
