import { Listbox } from '@foldkit/ui'

export const SortListbox = Listbox.make<string>()

export const createLocalSelection = (Listbox: { make: () => unknown }) =>
  Listbox.make()
