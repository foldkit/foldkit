import { Ui } from 'foldkit'

// ❌ Bad
// Creating the selection factory inside a function gives it a fresh identity on
// every call, breaking the component's internal state.
const badInit = () => {
  const radioGroup = Ui.RadioGroup.create()
  return radioGroup.init()
}

// ✅ Good
// Create the factory once at module scope.
const radioGroup = Ui.RadioGroup.create()
const goodInit = () => radioGroup.init()
