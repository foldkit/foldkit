import { Listbox } from '@foldkit/ui'

// ❌ Bad
// Each call creates a new Block class with its own identity.
const makeSortListbox = () => Listbox.make<string>()

// ✅ Good
// Create the class once and provide SortListbox to the parent.
const SortListbox = Listbox.make<string>()
