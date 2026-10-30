import { Listbox } from '@foldkit/ui'

// ❌ Bad
// Each call creates a new Block class with its own identity.
const makeSortListbox = () => Listbox.makeBlock<string>()

// ✅ Good
// Create the class once and provide SortListbox.Live to the parent.
const SortListbox = Listbox.makeBlock<string>()
