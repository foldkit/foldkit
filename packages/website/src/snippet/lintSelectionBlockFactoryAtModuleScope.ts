import { makeBlock as makeListboxBlock } from '@foldkit/ui/listbox'

// ❌ Bad: each call constructs a new component definition.
const makeSortListbox = () => makeListboxBlock()

// ✅ Good: configure Bindings with one module-scope definition.
const SortListbox = makeListboxBlock()
