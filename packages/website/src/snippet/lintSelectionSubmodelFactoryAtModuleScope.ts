import { Listbox } from '@foldkit/ui'

const sortListbox = Listbox.create()

// ❌ Bad
// Re-creating the factory on each update gives it a fresh identity, so its
// internal selection state never persists.
const badUpdate = (model: Model, message: Message) => {
  const listbox = Listbox.create()
  return listbox.update(model.sort, message)
}

// ✅ Good
// Reuse the module-scope factory.
const goodUpdate = (model: Model, message: Message) =>
  sortListbox.update(model.sort, message)
