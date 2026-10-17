import * as Child from './child'
import { Application } from './definition'

// ❌ Bad
// The root reaches into the child Message namespace to build a child Message.
const badRouting = () =>
  GotChildMessage({ message: Child.Message.ClickedSave() })

const clickedSave = Child.Message.ClickedSave
const badAliasRouting = () => GotChildMessage({ message: clickedSave() })

// ✅ Good
// The parent invokes the public Step projected by its child Binding.
const goodRouting = Application.step(() => ChildBinding.save())
