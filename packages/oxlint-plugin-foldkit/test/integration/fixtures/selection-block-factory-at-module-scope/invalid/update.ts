import * as Selection from '@foldkit/ui/listbox'

export const makeSortListbox = () => {
  const SortListbox = Selection.make<string>()
  return SortListbox
}
