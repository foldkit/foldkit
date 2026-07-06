// ❌ Bad
// The root reaches into the child Message namespace to build a child Message.
const badRouting = () =>
  GotChildMessage({ message: Child.Message.ClickedSave() })

// ✅ Good
// The child exports a helper; the root routes its output through the wrapper.
const goodRouting = () => GotChildMessage({ message: Child.clickedSave() })
