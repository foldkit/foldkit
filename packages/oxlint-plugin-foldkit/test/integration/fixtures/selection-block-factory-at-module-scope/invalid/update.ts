import * as Selection from '@foldkit/ui/listbox'

export const makeSortListbox = () => {
  const SortListbox = Selection.makeBlock<string>()
  return SortListbox.Live
}
