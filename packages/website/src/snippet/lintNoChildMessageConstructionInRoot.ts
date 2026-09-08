// ❌ Bad
// The root reaches into the child Message namespace to build a child Message.
const badRouting = () =>
  GotChildMessage({ message: Child.Message.ClickedSave() })

// ✅ Good
// The child exports an update capability. The parent folds the complete child
// result without importing or constructing its internal Message.
const foldChildSave = Update.foldChildStep({
  update: Child.save,
  read: model => Option.some(model.child),
  write: (model, nextChild) => evo(model, { child: () => nextChild }),
  toParentMessage: message => GotChildMessage({ message }),
})

const goodRouting = model => foldChildSave(model)
