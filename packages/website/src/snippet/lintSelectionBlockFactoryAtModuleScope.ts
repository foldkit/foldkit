import { Listbox } from '@foldkit/ui'

// ❌ Bad: each call constructs a new component definition.
const makeSortListbox = () => Listbox.create()

// ✅ Good: configure Bindings with one module-scope definition.
const SortListbox = Listbox.create()
