import { Binding, Composition } from './compiler-diagnostics.fixture.js'

type ConnectedModel = Parameters<ReturnType<typeof Binding.requestIncrement>>[0]
const handleClicked = (model: ConnectedModel) =>
  model.child.count > 0 ? Binding.requestIncrement()(model) : { model }

Composition.makeUpdate({
  Clicked: handleClicked,
  CompletedSave: model => ({ model }),
})
